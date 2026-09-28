"""考研英语（英二）大纲词表构建：ECDICT(tag 含 ky) → vocab.db(sqlite3) → assets/vocab-data.js

用法（仅用标准库）：
  python vocab/build_vocab.py                 # 下载 ECDICT 到 vocab/.cache/ 后构建
  python vocab/build_vocab.py --csv PATH      # 使用本地 ecdict.csv
  python vocab/build_vocab.py --export-only   # 只从现有 vocab.db 重新导出 JS

数据来源：skywind3000/ECDICT（MIT License）
"""
import argparse
import csv
import datetime
import json
import math
import re
import sqlite3
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / '.cache'
DB = HERE / 'vocab.db'
JS = HERE.parent / 'assets' / 'vocab-data.js'
URL = 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv'
UNITS = 22
MAX_LINES = 4
WORD_RE = re.compile(r"^[A-Za-z][A-Za-z'\-]*$")
FORMS = {'p': '过去式', 'd': '过去分词', 'i': '现在分词', '3': '三单', 'r': '比较级', 't': '最高级', 's': '复数'}


def download(url, dest, tries=4):
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(dest.suffix + '.part')
    for n in range(1, tries + 1):
        have = part.stat().st_size if part.exists() else 0
        req = urllib.request.Request(url, headers={'User-Agent': 'build_vocab/1.0', **({'Range': f'bytes={have}-'} if have else {})})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                mode = 'ab' if have and r.status == 206 else 'wb'
                total = have if mode == 'ab' else 0
                with open(part, mode) as f:
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
                        total += len(chunk)
                        print(f'\r下载中 {total / 1e6:.1f} MB', end='', flush=True)
            print()
            part.replace(dest)
            return dest
        except OSError as e:
            print(f'\n第 {n} 次下载失败：{e}', file=sys.stderr)
            if n < tries:
                time.sleep(2 * n)
    sys.exit(f'无法下载 {url}\n可手动下载 ecdict.csv 放到 {dest}，或用 --csv 指定路径。')


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def clean_trans(s):
    lines = [x.strip() for x in (s or '').replace('\\n', '\n').splitlines() if x.strip()]
    main = [x for x in lines if not x.startswith('[网络]')]
    return '\n'.join((main or lines)[:MAX_LINES])


def clean_forms(s):
    by_form = {}
    for part in (s or '').split('/'):
        k, _, v = part.partition(':')
        if k in FORMS and v:
            by_form.setdefault(v, []).append(FORMS[k])
    return '；'.join(f'{"/".join(labels)} {v}' for v, labels in by_form.items())


def load(csv_path):
    csv.field_size_limit(1 << 30)
    rows = {}
    with open(csv_path, encoding='utf-8', newline='') as f:
        for r in csv.DictReader(f):
            w = (r.get('word') or '').strip()
            if 'ky' not in (r.get('tag') or '').split() or not WORD_RE.match(w):
                continue
            trans = clean_trans(r.get('translation'))
            if not trans:
                continue
            ph = (r.get('phonetic') or '').strip()
            item = dict(word=w, phonetic=f'/{ph}/' if ph else '', trans=trans, forms=clean_forms(r.get('exchange')),
                        collins=num(r.get('collins')), frq=num(r.get('frq')), bnc=num(r.get('bnc')))
            key = w.lower()
            if key not in rows or (w == key and rows[key]['word'] != key):
                rows[key] = item
    big = 1 << 30
    return sorted(rows.values(), key=lambda x: (x['frq'] or big, x['bnc'] or big, x['word'].lower()))


def build_db(words, src):
    size = math.ceil(len(words) / UNITS)
    tmp = DB.with_suffix('.tmp')
    tmp.unlink(missing_ok=True)
    con = sqlite3.connect(tmp)
    con.executescript('''
      CREATE TABLE words(rank INTEGER PRIMARY KEY, word TEXT NOT NULL UNIQUE, phonetic TEXT, trans TEXT NOT NULL,
        forms TEXT, collins INTEGER, frq INTEGER, bnc INTEGER, unit INTEGER NOT NULL);
      CREATE INDEX idx_words_unit ON words(unit);
      CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);''')
    con.executemany('INSERT INTO words VALUES(?,?,?,?,?,?,?,?,?)',
                    [(i + 1, w['word'], w['phonetic'], w['trans'], w['forms'], w['collins'], w['frq'], w['bnc'], i // size + 1)
                     for i, w in enumerate(words)])
    meta = {'source': 'ECDICT (skywind3000/ECDICT)', 'license': 'MIT', 'filter': "tag contains 'ky'（考研大纲）",
            'order': 'frq 升序 → bnc 升序（0 视为无数据排最后）', 'units': str(UNITS), 'unit_size': str(size),
            'count': str(len(words)), 'built': datetime.date.today().isoformat(), 'csv': Path(src).name}
    con.executemany('INSERT INTO meta VALUES(?,?)', meta.items())
    con.commit()
    con.close()
    tmp.replace(DB)


def export_js():
    con = sqlite3.connect(DB)
    meta = dict(con.execute('SELECT key, value FROM meta'))
    rows = con.execute('SELECT word, phonetic, trans, forms, collins FROM words ORDER BY rank').fetchall()
    con.close()
    head = {'source': meta['source'], 'license': meta['license'], 'built': meta['built'], 'count': len(rows),
            'units': int(meta['units']), 'unitSize': int(meta['unit_size'])}
    body = ',\n'.join(json.dumps(list(r), ensure_ascii=False, separators=(',', ':')) for r in rows)
    JS.write_text('/* 由 vocab/build_vocab.py 生成，勿手改。数据：ECDICT（MIT）考研大纲词\n'
                  '   words: [word, phonetic, trans(\\n 分行), forms, collins] 按频次排序 */\n'
                  f'window.VOCAB = {{meta:{json.dumps(head, ensure_ascii=False)},\nwords:[\n{body}\n]}};\n', encoding='utf-8')
    return head


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding='utf-8', errors='replace')
    ap =argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--csv', type=Path, help='本地 ecdict.csv 路径（默认 vocab/.cache/ecdict.csv，不存在则下载）')
    ap.add_argument('--url', default=URL, help='ECDICT csv 下载地址')
    ap.add_argument('--export-only', action='store_true', help='跳过构建，只从 vocab.db 导出 JS')
    a = ap.parse_args()
    if not a.export_only:
        src = a.csv or CACHE / 'ecdict.csv'
        if not src.exists():
            if a.csv:
                sys.exit(f'找不到 {src}')
            download(a.url, src)
        words = load(src)
        if not words:
            sys.exit('没有筛出任何 ky 词条：请确认文件为 ECDICT 的 ecdict.csv')
        build_db(words, src)
    head = export_js()
    print(f'完成：{head["count"]} 词 · {head["units"]} Unit × {head["unitSize"]} 词\n  {DB}\n  {JS}')


if __name__ == '__main__':
    main()
