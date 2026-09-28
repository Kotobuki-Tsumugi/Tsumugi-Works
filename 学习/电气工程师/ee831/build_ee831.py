"""保定 831《电力系统分析基础》知识点卡：cards.md → ee831.db(sqlite3) → assets/deck-ee831.js

用法（Python 标准库；有 node 时用 assets/katex 校验公式）：
  python ee831/build_ee831.py                # 解析 cards.md、校验、入库、导出
  python ee831/build_ee831.py --export-only  # 只从 ee831.db 重新导出 JS
  python ee831/build_ee831.py --no-check     # 跳过 KaTeX 校验

cards.md 格式：`# 第N章 章名`，`## id | 标题 | 重要度`，其后 `节:`、`公式:`（可跨行，$$…$$）、
`条件:`、`要点:`、`用法:`、`易错:`、`例题:` 各一行（可续行）。内容依据 2026 保定 831 考试大纲自编。
"""
import argparse
import datetime
import json
import re
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = HERE / 'cards.md'
DB = HERE / 'ee831.db'
JS = ROOT / 'assets' / 'deck-ee831.js'
KATEX_CHECK = ROOT / 'tools' / 'katex_check.cjs'
OPENS = ['2026-10-12', '2026-10-12', '2026-12-14', '2027-01-11', '2027-02-08', '2027-01-25', '2027-02-22', '2027-03-22']
IMPS = ('必背', '常用', '了解')
FIELDS = {'节': 'sec', '公式': 'formula', '条件': 'cond', '要点': 'tip', '用法': 'use', '易错': 'err', '例题': 'ex'}
MATH_RE = re.compile(r'\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$')


def parse(text):
    chapters, cards, errors, cur, field = [], [], [], None, None
    for n, line in enumerate(text.splitlines(), 1):
        if m := re.match(r'^# 第(\d+)章\s+(.+)$', line):
            chapters.append(m.group(2).strip())
            cur = field = None
            continue
        if m := re.match(r'^## (.+)$', line):
            parts = [p.strip() for p in m.group(1).split('|')]
            if len(parts) != 3 or not chapters:
                errors.append(f'第 {n} 行：卡片标题应为「## id | 标题 | 重要度」且位于章标题之后')
                continue
            cur = dict(id=parts[0], title=parts[1], imp=parts[2], ch=len(chapters) - 1, line=n, **{v: '' for v in FIELDS.values()})
            cards.append(cur)
            field = None
            continue
        if cur is None:
            continue
        if m := re.match(r'^(节|公式|条件|要点|用法|易错|例题)[:：]\s*(.*)$', line):
            field = FIELDS[m.group(1)]
            cur[field] = m.group(2).strip()
        elif field and line.strip():
            cur[field] = (cur[field] + '\n' + line.strip()).strip()
    seen = set()
    for c in cards:
        where = f'{c["id"]}（第 {c["line"]} 行）'
        if not re.fullmatch(r'ee-\d-\d{2}', c['id']):
            errors.append(f'{where}：id 格式应为 ee-章-序号')
        if c['id'] in seen:
            errors.append(f'{where}：id 重复')
        seen.add(c['id'])
        if c['imp'] not in IMPS:
            errors.append(f'{where}：未知重要度「{c["imp"]}」')
        if not re.fullmatch(r'\$\$[\s\S]+\$\$', c['formula']):
            errors.append(f'{where}：缺少 $$…$$ 公式')
    if len(chapters) != len(OPENS):
        errors.append(f'章数 {len(chapters)} 与开放日期 {len(OPENS)} 不一致')
    return chapters, cards, errors


def katex_check(cards):
    if not shutil.which('node'):
        print('未找到 node，跳过 KaTeX 校验')
        return None
    spans = [[(m.group(1) or m.group(2)).strip(), m.group(1) is not None, c['id']]
             for c in cards for f in FIELDS.values() for m in MATH_RE.finditer(c[f])]
    r = subprocess.run(['node', str(KATEX_CHECK)], input=json.dumps(spans).encode('utf-8'), capture_output=True)
    if r.returncode:
        sys.exit('KaTeX 校验脚本失败：' + r.stderr.decode('utf-8', 'replace')[:400])
    return json.loads(r.stdout.decode('utf-8')), len(spans)


def build_db(chapters, cards):
    tmp = DB.with_suffix('.tmp')
    tmp.unlink(missing_ok=True)
    con = sqlite3.connect(tmp)
    con.executescript('''
      CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE chapters(idx INTEGER PRIMARY KEY, name TEXT NOT NULL, opens TEXT NOT NULL);
      CREATE TABLE cards(id TEXT PRIMARY KEY, ch INTEGER NOT NULL REFERENCES chapters(idx), sec TEXT, title TEXT NOT NULL,
        imp TEXT NOT NULL, formula TEXT NOT NULL, cond TEXT, tip TEXT, use TEXT, err TEXT, ex TEXT, ord INTEGER);''')
    con.executemany('INSERT INTO chapters VALUES(?,?,?)', [(i, n, OPENS[i]) for i, n in enumerate(chapters)])
    con.executemany('INSERT INTO cards VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
                    [(c['id'], c['ch'], c['sec'], c['title'], c['imp'], c['formula'], c['cond'], c['tip'], c['use'],
                      c['err'], c['ex'], k) for k, c in enumerate(cards)])
    con.executemany('INSERT INTO meta VALUES(?,?)', {
        'source': '依据华北电力大学（保定）2026 年 831 电力系统分析基础考试大纲自编', 'license': '个人学习用',
        'built': datetime.date.today().isoformat()}.items())
    con.commit()
    con.close()
    tmp.replace(DB)


def export_js():
    con = sqlite3.connect(DB)
    meta = dict(con.execute('SELECT key, value FROM meta'))
    chapters = [{'name': n, 'from': d} for n, d in con.execute('SELECT name, opens FROM chapters ORDER BY idx')]
    rows = con.execute('SELECT id, ch, sec, title, imp, formula, cond, tip, use, err, ex FROM cards ORDER BY ord').fetchall()
    con.close()
    head = {'id': 'ee831', 'name': '831 电力系统分析', 'source': meta['source'], 'license': meta['license'],
            'built': meta['built'], 'count': len(rows)}
    JS.write_text('/* 由 ee831/build_ee831.py 生成，勿手改（改 ee831/cards.md 后重建）\n'
                  '   cards: [id, ch, sec, title, imp, formula($$…$$), cond, tip, use, err, ex]；文本内数学用 $…$ */\n'
                  f'window.DECK_EE831 = {{meta:{json.dumps(head, ensure_ascii=False)},\n'
                  f'chapters:{json.dumps(chapters, ensure_ascii=False)},\ncards:[\n'
                  + ',\n'.join(json.dumps(list(r), ensure_ascii=False, separators=(',', ':')) for r in rows)
                  + '\n]};\n', encoding='utf-8')
    return head, chapters, rows


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--export-only', action='store_true', help='只从 ee831.db 重新导出 JS')
    ap.add_argument('--no-check', action='store_true', help='跳过 KaTeX 校验')
    a = ap.parse_args()
    if not a.export_only:
        chapters, cards, errors = parse(SRC.read_text(encoding='utf-8'))
        if errors:
            sys.exit('cards.md 有误：\n  ' + '\n  '.join(errors))
        if not a.no_check:
            res = katex_check(cards)
            if res:
                bad, n = res
                print(f'KaTeX：{n} 段，失败 {len(bad)}')
                if bad:
                    sys.exit('\n'.join(f'  [{b["where"]}] {b["msg"]} :: {b["tex"][:90]}' for b in bad))
        build_db(chapters, cards)
    head, chapters, rows = export_js()
    per = [sum(1 for r in rows if r[1] == i) for i in range(len(chapters))]
    print(f'完成：{head["count"]} 张卡 · 各章 {per}\n  {DB}\n  {JS}')


if __name__ == '__main__':
    main()
