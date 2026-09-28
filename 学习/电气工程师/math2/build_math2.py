"""数学二：公式卡片 + 历年真题 → math2.db(sqlite3) → assets/deck-math2.js、assets/math2-papers.js、assets/math2-img/

用法（Python 标准库 + node 做 KaTeX 校验）：
  python math2/build_math2.py                # 缺的源文件自动下载到 math2/.cache/ 后构建
  python math2/build_math2.py --export-only  # 只从 math2.db 重新导出 JS
  python math2/build_math2.py --no-check     # 跳过 KaTeX 校验

数据来源：
  公式  ULing19/Codex-for-learning-math（MIT）handbook/formula-data.js，按数二大纲筛选
  数二  TsekaLuk/Kaoyan-Math2-Papers（1987–2024，2021 文件实为数三，已排除）
  数一  TsekaLuk/Kaoyan-Math1-Papers（CC BY-NC-SA 4.0）仅用于还原「同试卷一第 X 题」
"""
import argparse
import datetime
import html
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CACHE = HERE / '.cache'
DB = HERE / 'math2.db'
ASSETS = ROOT / 'assets'
DECK_JS = ASSETS / 'deck-math2.js'
PAPERS_JS = ASSETS / 'math2-papers.js'
IMG_DIR = ASSETS / 'math2-img'
KATEX_CHECK = ROOT / 'tools' / 'katex_check.cjs'

RAW_M2 = 'https://raw.githubusercontent.com/TsekaLuk/Kaoyan-Math2-Papers/main/'
RAW_M1 = 'https://raw.githubusercontent.com/TsekaLuk/Kaoyan-Math1-Papers/main/'
RAW_F = 'https://raw.githubusercontent.com/ULing19/Codex-for-learning-math/main/'
M2_DOCS = {  # 缓存名 → 仓库路径
    '1987-2019': 'solutions/math2_1987-2019/math2_1987-2019.md',
    '2020': 'solutions/2020/math2_2020/math2_2020.md',
    '2022': 'solutions/2022/math2_2022/math2_2022.md',
    '2023': 'solutions/2023/math2_2023/math2_2023.md',
    '2024': 'solutions/2024/math2_2024.md',
}


def m1_path(year, kind):
    if kind == 'q':
        return f'papers/{year}年考研数学(一)真题.md'
    return f'solutions/{year}年解析/' + ('2024.md' if year == 2024 else f'{year}年解析.md')


# 章节（公式卡与真题共用）：name, 公式库章名（subject, chapter）, 路线开放日期
CHAPTERS = [
    ('前置基础', [('前置基础', '0. 前置基础'), ('附录速查', 'A. 常用数值附录')], '2026-09-28'),
    ('函数、极限与连续', [('高等数学', '第1章 函数与极限')], '2026-10-12'),
    ('导数与微分', [('高等数学', '第2章 导数与微分')], '2026-11-16'),
    ('中值定理与导数应用', [('高等数学', '第3章 微分中值定理与导数应用')], '2026-11-30'),
    ('不定积分', [('高等数学', '第4章 不定积分')], '2026-12-14'),
    ('定积分与反常积分', [('高等数学', '第5章 定积分')], '2026-12-28'),
    ('定积分应用', [('高等数学', '第6章 定积分应用')], '2026-12-28'),
    ('微分方程', [('高等数学', '第7章 微分方程')], '2027-01-11'),
    ('多元函数微分学', [('高等数学', '第9章 多元函数微分法及应用')], '2027-01-25'),
    ('二重积分', [('高等数学', '第10章 重积分')], '2027-02-08'),
    ('行列式', [('线性代数', '第1章 行列式')], '2027-02-22'),
    ('矩阵', [('线性代数', '第2章 矩阵及其运算')], '2027-02-22'),
    ('线性方程组', [('线性代数', '第3章 初等变换与线性方程组')], '2027-03-08'),
    ('向量组', [('线性代数', '第4章 向量组线性相关性')], '2027-03-08'),
    ('特征值与二次型', [('线性代数', '第5章 相似矩阵及二次型')], '2027-03-22'),
]
CH_OF = {src: i for i, (_, srcs, _) in enumerate(CHAPTERS) for src in srcs}

# 超出数二大纲的公式卡（按标题关键词 + id）
OUT_OF_SCOPE = re.compile(
    r'三重|柱坐标|球坐标|柱、球|方向导数|梯度|切平面|Bernoulli|全微分方程|积分因子|Euler 方程|欧拉方程|方程组矩阵|'
    r'转动惯量|二元函数二阶 Taylor|Jacobi|基变换|坐标变换公式|Fourier|Gaussian|Beta|Gamma|Stolz|Stirling|Cauchy 收敛|'
    r'Newton 迭代|Euler 代换|最小二乘|四个子空间|子空间|维数公式|最小多项式|奇异值|Sherman|Schur|双曲|分位数|临界值|希腊字母|'
    r'组合数|正矢|弹性')
DROP_IDS = {'calc10-coordinate-systems', 'pre-trig-phase-shift-auxiliary-expanded'}
# 上游文本里偶有粘连的宏（\toinfty、\intsin），拆成两个已知宏
MACROS = set('''to le ge ne pm mp sim approx int iint oint sum prod lim pi alpha beta gamma delta theta lambda mu sigma
varphi phi omega infty sin cos tan cot sec csc ln log exp sqrt frac cdot cdots ldots times partial Delta'''.split())


def fix_macros(s):
    def rep(m):
        w = m.group(1)
        if w == 'arccot':
            return r'\operatorname{arccot}'
        if w in MACROS or w == 'lnapprox' or len(w) < 4:
            return m.group(0)
        for k in range(2, len(w) - 1):
            a, b = w[:k], w[k:]
            if a in MACROS and b in MACROS:
                return f'\\{a} \\{b}'
        return m.group(0)
    return re.sub(r'\\([A-Za-z]+)', rep, s)
KEEP_IDS = {'calc9-multivariable-derivative', 'calc5-gaussian-integral'}
IMPS = ('必背', '常用', '技巧', '了解')

# 真题自动归章：每章若干 (正则, 权重)；在去空白后的题干上计分，平分取靠后的章
RULES = [
    (1, [(r'极限|lim|无穷小|间断|夹逼|数列|渐近线', 1)]),
    (2, [(r'导数|可导|求导|切线|法线|隐函数|参数方程|y\'|f\'|\\prime|曲率', 1), (r'高阶导|f\^\{?\(\d', 2)]),
    (3, [(r'中值|罗尔|拉格朗日|泰勒|Taylor|单调|极值|凹|凸|拐点|不等式|零点|根的个数|最大值|最小值', 1), (r'存在\\xi|存在ξ|\\xi\\in', 2)]),
    (4, [(r'不定积分|原函数', 2), (r'\\intf|\\int\\frac|\\int\{', 1)]),
    (5, [(r'定积分|\\int_|反常积分|广义积分|变上限|收敛', 1), (r'\\int_\{?-?\\?(infty|pi|0|1|a)', 1)]),
    (6, [(r'面积|体积|旋转|弧长|侧面积|形心|质心|做功|压力|引力', 2)]),
    (7, [(r'微分方程|通解|特解|y\'\'|y\^\{\\prime\\prime\}|初始条件|y\(0\)=', 2)]),
    (8, [(r'偏导|\\partial|全微分|可微|条件极值|拉格朗日乘|z=z\(x,y\)|f\(x,y\)|二元函数', 2)]),
    (9, [(r'二重积分|\\iint|累次积分|积分次序|dxdy|d\\sigma|极坐标|\\intdx\\int|\\int_\{?.*?\}?\^\{?.*?\}?dx\\int', 2)]),
    (10, [(r'行列式|代数余子式|\|[A-Z]\||\\left\|[A-Z]', 3)]),
    (11, [(r'矩阵|伴随|A\^\{?\*|A\^\{?-1|逆矩阵|可逆|初等矩阵|秩', 2)]),
    (12, [(r'方程组|基础解系|通解|Ax=b|Ax=0|Ax=\\beta|非齐次|齐次', 3)]),
    (13, [(r'向量组|线性相关|线性无关|线性表示|线性表出|极大(线性)?无关|\\alpha_\{?[123]', 3)]),
    (14, [(r'特征值|特征向量|相似|对角化|对角矩阵|二次型|正定|标准形|正交变换|合同|正交矩阵', 4)]),
]
RULES = [(ch, [(re.compile(p), w) for p, w in rs]) for ch, rs in RULES]
LINALG = range(10, 15)


def classify(q, a=''):
    for text in (q, q + a):
        t = re.sub(r'\s+', '', text)
        score = {}
        for ch, rs in RULES:
            s = sum(min(len(r.findall(t)), 3) * w for r, w in rs)
            if s:
                score[ch] = s
        la = {c: s for c, s in score.items() if c in LINALG}
        pool = la if la and max(la.values()) >= 3 else score
        if pool:
            return max(pool, key=lambda c: (pool[c], c))
    return 1


def fetch(url, dest, tries=5):
    if dest.exists() and dest.stat().st_size:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'build_math2/1.0'})
    for n in range(1, tries + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            dest.with_suffix(dest.suffix + '.part').write_bytes(data)
            dest.with_suffix(dest.suffix + '.part').replace(dest)
            return dest
        except OSError as e:
            if getattr(e, 'code', None) == 404:
                return None
            print(f'  第 {n} 次下载失败 {url}: {e}', file=sys.stderr)
            time.sleep(2 * n)
    return None


def quote_url(base, path):
    return base + urllib.parse.quote(path)


MATH_RE = re.compile(r'\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$')


def math_spans(text, where):
    out = []
    for m in MATH_RE.finditer(text or ''):
        dd, db, ip, id_ = m.groups()
        out.append([(dd or db or ip or id_).strip(), dd is not None or db is not None, where])
    return out


# ---------- 公式卡 ----------

def load_formulas():
    src = fetch(RAW_F + 'handbook/formula-data.js', CACHE / 'formula-data.js')
    fetch(RAW_F + 'LICENSE', CACHE / 'formula-LICENSE')
    if not src:
        sys.exit('无法下载 formula-data.js')
    out = subprocess.run(['node', str(HERE / 'dump_formulas.cjs'), str(src)], capture_output=True, check=True)
    raw = json.loads(out.stdout.decode('utf-8'))
    cards, skipped = [], {}
    for order, c in enumerate(raw):
        ch = CH_OF.get((c['subject'], c['chapter']))
        why = None
        if ch is None:
            why = '章节不在数二范围'
        elif c['id'] in DROP_IDS:
            why = '重复/超纲'
        elif c['id'] not in KEEP_IDS and (c['importance'] not in IMPS or OUT_OF_SCOPE.search(c['title'])):
            why = '拓展或超纲'
        elif c['subject'] == '前置基础' and c['importance'] not in ('必背', '常用'):
            why = '前置基础只留必背/常用'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        tex = c['latex'].strip()
        if '\\\\' in tex and not tex.startswith('\\begin'):
            tex = '\\begin{gathered}' + tex + '\\end{gathered}'
        tip = c['intuition'].strip()
        if c.get('miniProof', '').strip():
            tip += '\n简证：' + c['miniProof'].strip()
        f = fix_macros
        cards.append(dict(id=c['id'], ch=ch, sec=c['section'], title=f(c['title']), imp=c['importance'],
                          formula=f'$${f(tex)}$$', cond=f(c['conditions'].strip()), tip=f(tip), use=f(c['howToUse'].strip()),
                          err=f(c['mistakes'].strip()), ex=f(c['example'].strip()), order=order))
    cards.sort(key=lambda x: (x['ch'], x['order']))
    return cards, skipped


# ---------- Markdown → 安全 HTML ----------

TABLE_TAG = re.compile(r'&lt;(/?)(table|thead|tbody|tr|td|th)((?:\s+(?:colspan|rowspan)=(?:&quot;|&#x27;)?\d+(?:&quot;|&#x27;)?)*)\s*&gt;', re.I)
IMG_RE = re.compile(r'!\[[^\]]*\]\(([^)\s]+)\)')
CIRCLED = {str(i): chr(0x2460 + i - 1) for i in range(1, 11)}


def fix_tex(tex):
    tex = re.sub(r'\\textcircled\s*\{\s*(\d+)\s*\}', lambda m: f'\\text{{{CIRCLED.get(m.group(1), m.group(1))}}}', tex)
    return tex


class Images:
    def __init__(self):
        self.used, self.missing = set(), []

    def tag(self, base_url, rel):
        name = re.sub(r'[^A-Za-z0-9._-]', '_', rel.rsplit('/', 1)[-1])
        dest = IMG_DIR / name
        if not dest.exists():
            got = fetch(base_url + '/'.join(urllib.parse.quote(p) for p in rel.split('/')), CACHE / 'img' / name)
            if got:
                IMG_DIR.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(got, dest)
        if dest.exists():
            self.used.add(name)
            return f'<img src="assets/math2-img/{name}" alt="题图" loading="lazy">'
        self.missing.append(rel)
        return '<span class="p-miss">[图片缺失]</span>'


def md_html(text, base_url, images, spans, where):
    """数学段原样保留（只做 HTML 转义与少量修正），正文转义后放行表格标签与本地图片。"""
    parts, pos, out = [], 0, []
    text = text.strip()
    for m in MATH_RE.finditer(text):
        parts.append(('t', text[pos:m.start()]))
        parts.append(('m', m))
        pos = m.end()
    parts.append(('t', text[pos:]))
    for kind, v in parts:
        if kind == 'm':
            dd, db, ip, id_ = v.groups()
            disp = dd is not None or db is not None
            tex = fix_tex(re.sub(r'\s*\n\s*', ' ', (dd or db or ip or id_).strip()))
            spans.append([tex, disp, where])
            esc = html.escape(tex, quote=False)
            out.append(f'\n\n$${esc}$$\n\n' if disp else f'${esc}$')
            continue
        imgs = []

        def keep_img(m):
            imgs.append(images.tag(base_url, m.group(1)))
            return f'\x00{len(imgs) - 1}\x00'

        t = IMG_RE.sub(keep_img, html.unescape(v))
        t = TABLE_TAG.sub(lambda m: f'<{m.group(1)}{m.group(2).lower()}{html.unescape(m.group(3))}>', html.escape(t))
        t = re.sub('\x00(\\d+)\x00', lambda m: imgs[int(m.group(1))], t)
        out.append(t)
    body = ''.join(out)
    paras = [p.strip() for p in re.split(r'\n\s*\n', body) if p.strip()]
    return ''.join(f'<p>{p}</p>' if not p.startswith('$$') else f'<div class="p-dm">{p}</div>'
                   for p in (re.sub(r'\s*\n\s*', '<br>', p) for p in paras))


# ---------- 真题切分 ----------

CN = {c: i for i, c in enumerate('〇一二三四五六七八九')} | {'零': 0, '○': 0, 'O': 0, '0': 0}


def cn_num(s):
    if len(s) == 4:
        return int(''.join(str(CN[c]) for c in s))
    if s == '十':
        return 10
    if s.startswith('十'):
        return 10 + CN[s[1]]
    if s.endswith('十'):
        return CN[s[0]] * 10
    if '十' in s:
        a, b = s.split('十')
        return CN[a] * 10 + CN[b]
    return CN[s]


SEC_HEAD = re.compile(r'([一二三四五六七八九十]{1,3})\s*[、.．]\s*(.*)')
MARKS = (re.compile(r'^[ \t]*[(（]\s*(\d{1,2})\s*[)）]', re.M), re.compile(r'^[ \t]*(\d{1,2})\s*[.．、](?!\d)', re.M))
SOL_RE = re.compile(r'(?:^|\n)[ \t]*(?:[(（]\s*\d{1,2}\s*[)）]\s*)?(?:【(?:答案|解析|解|证明|分析|详解)】|'
                    r'(?:解|证|证明|分析|详解)\s*[.．]|解\s*[:：]|解\s+(?=\$)|同试卷)')
KEY_RE = [re.compile(r'(?:应选|答案】\s*选?|故选|所以选|因此选|选)\s*[(（]\s*([A-D])\s*[)）]'), re.compile(r'应选\s*([A-D])(?![A-Za-z])')]
XREF = re.compile(r'同试卷([一二])第\s*([一二三四五六七八九十]+)\s*(?:\[\s*(\d+)\s*\])?\s*题')
PTS_ITEM = re.compile(r'满分\s*(\d+)\s*分')


def split_sections(text):
    text = re.sub(r'(?<!# )(?<=[^\n])(?=[一二三四五六七八九]、(?:填空|选择|解答|计算|证明)题)', '\n\n# ', text)
    sections, cur = [], None
    for line in text.split('\n'):
        s = line.lstrip()
        if s.startswith('#'):
            h = s.lstrip('#').strip()
            m = SEC_HEAD.match(h)
            if m:
                title, body = m.group(2), ''
                k = title.find('【')
                if k >= 0:
                    title, body = title[:k], title[k:]
                cur = {'num': m.group(1), 'title': title, 'lines': [body]}
                sections.append(cur)
                continue
            line = h
        if cur is not None:
            cur['lines'].append(line)
    for s in sections:
        s['body'] = '\n'.join(s.pop('lines'))
    return sections


def head_info(title):
    t = re.sub(r'[\s$]|\\,|\{|\}', '', title)
    t = t.replace('\\sim', '~').replace('～', '~').replace('—', '~').replace('至', '~')
    kind = 'c' if '选择' in t else 'f' if '填空' in t else 'a'
    per = re.search(r'每小题(\d+)分', t)
    total = re.findall(r'(?:满分|共)(\d+)分', t)
    rng = re.search(r'(\d+)[~-](\d+)小?题', t)
    cnt = re.search(r'共(\d+)小?题', t)
    want = (int(rng.group(2)) - int(rng.group(1)) + 1) if rng else int(cnt.group(1)) if cnt else \
        (int(total[-1]) // int(per.group(1))) if per and total else 1
    return kind, int(per.group(1)) if per else None, int(total[-1]) if total else None, want, int(rng.group(1)) if rng else None


def chains(body, first, sol_required):
    best = []
    for rx in MARKS:
        cands = [(int(m.group(1)), m.start(), m.end()) for m in rx.finditer(body)]
        for strict in ((True, False) if sol_required else (False,)):
            chain, expect = [], first
            for n, s, e in cands:
                if n != expect or (chain and s <= chain[-1][1]):
                    continue
                if chain and strict and not SOL_RE.search(body[chain[-1][2]:s]):
                    continue
                chain.append((n, s, e))
                expect += 1
            if len(chain) > len(best):
                best = chain
    return best


def pick_key(text):
    for rx in KEY_RE:
        m = rx.search(text)
        if m:
            return m.group(1)
    return ''


def split_qa(text):
    m = SOL_RE.search(text, 1) if text[:1] != '【' else SOL_RE.search(text)
    if not m:
        return text.strip(), ''
    return text[:m.start()].strip(), text[m.start():].strip()


LEAD = re.compile(r'^\s*(?:[(（]\s*\d{1,2}\s*[)）]|\d{1,2}\s*[.．、](?!\d))?\s*(?:[(（]\s*本题满分\s*\d+\s*分\s*[)）])?\s*')


def cut_items(sections, has_sol):
    """→ [(sec, n or None, text)]，n 为题号；diag 记录与标题预期不符的节。"""
    out, diag, last = [], [], 0
    for sec in sections:
        kind, per, total, want, start = head_info(sec['title'])
        sec.update(kind=kind, per=per, total=total, want=want)
        body = sec['body']
        multi = want > 1 or start is not None
        if not multi:
            first = MARKS[1].match(body.lstrip()) or MARKS[0].match(body.lstrip())
            n = int(first.group(1)) if first and int(first.group(1)) in (last + 1,) else None
            out.append((sec, n, body))
            last = n or last
            continue
        firsts = [start] if start else [last + 1, 1] if last else [1]
        best = []
        for f in firsts:
            c = chains(body, f, has_sol)
            if len(c) > len(best):
                best = c
        if not best:
            out.append((sec, None, body))
            diag.append(f'{sec["num"]}：未找到题号（预期 {want}）')
            continue
        if len(best) != want:
            diag.append(f'{sec["num"]}：找到 {len(best)} 题（预期 {want}）')
        for k, (n, s, _) in enumerate(best):
            e = best[k + 1][1] if k + 1 < len(best) else len(body)
            out.append((sec, n, body[s:e]))
        last = best[-1][0]
    return out, diag


class M1:
    """数学一题目/解析，用于还原「同试卷一第X[Y]题」。"""

    def __init__(self):
        self.docs = {}

    def doc(self, year, kind):
        k = (year, kind)
        if k not in self.docs:
            path = m1_path(year, kind)
            f = fetch(quote_url(RAW_M1, path), CACHE / 'm1' / f'{year}{kind}.md')
            self.docs[k] = (split_sections(f.read_text(encoding='utf-8')) if f else None,
                            quote_url(RAW_M1, path.rsplit('/', 1)[0]) + '/')
        return self.docs[k]

    def item(self, year, kind, sec_num, idx):
        secs, base = self.doc(year, kind)
        if not secs:
            return None, base
        sec = next((s for s in secs if s['num'] == sec_num), None)
        if sec is None:
            return None, base
        body = sec['body']
        if idx is None:
            return body.strip(), base
        rx = re.compile(r'^[ \t]*[(（]\s*(\d{1,2})\s*[)）]' + (r'\s*【' if kind == 's' else ''), re.M)
        cands = [(int(m.group(1)), m.start()) for m in rx.finditer(body)]
        if not cands:
            rx = MARKS[1]
            cands = [(int(m.group(1)), m.start()) for m in rx.finditer(body)]
        if not cands:
            return None, base
        base_n = cands[0][0]
        target = idx if any(n == idx for n, _ in cands) and idx >= base_n else base_n + idx - 1
        for j, (n, s) in enumerate(cands):
            if n == target:
                nxt = next((s2 for n2, s2 in cands[j + 1:] if n2 == n + 1), len(body))
                return body[s:nxt].strip(), base
        return None, base


def paper_questions(year, text, base_url, m1, images, spans):
    sections = split_sections(text)
    has_sol = len(SOL_RE.findall(text)) > 5
    items, diag = cut_items(sections, has_sol)
    nums = [n for _, n, _ in items if n]
    continuous = len(nums) > 3 and nums == list(range(1, len(nums) + 1)) and \
        len({s['num'] for s, n, _ in items if n}) > 1 and len(nums) == len(items)
    per_sec, qs, xref_bad = {}, [], []
    for sec, n, raw in items:
        per_sec[sec['num']] = per_sec.get(sec['num'], 0) + 1
    seen, guessed = {}, {}
    for sec, n, raw in items:
        seen[sec['num']] = seen.get(sec['num'], 0) + 1
        if continuous:
            label = str(n)
        elif per_sec[sec['num']] == 1:
            label = sec['num']
        else:
            label = f'{sec["num"]}({seen[sec["num"]]})'
        pm = PTS_ITEM.search(raw[:40])
        pts = int(pm.group(1)) if pm else sec['per'] or (sec['total'] // per_sec[sec['num']] if sec['total'] else 0)
        if not pm and not sec['per']:
            guessed.setdefault(sec['num'], []).append(len(qs))
        body = LEAD.sub('', raw, count=1)
        q, a = split_qa(body) if has_sol else (body.strip(), '')
        ref, qb, ab = '', base_url, base_url
        x = XREF.match(body.strip())
        if x and x.group(1) == '一':
            idx = int(x.group(3)) if x.group(3) else None
            ref = f'同数学一第{x.group(2)}' + (f'({idx})' if idx else '') + '题'
            q1, qb = m1.item(year, 'q', x.group(2), idx)
            a1, ab = m1.item(year, 's', x.group(2), idx)
            q = LEAD.sub('', q1, count=1) if q1 else f'（原题见 {year} 年数学一第{x.group(2)}' + (f'[{idx}]' if idx else '') + '题，本库未收录题干）'
            a = LEAD.sub('', a1, count=1) if a1 else ''
            if not q1 or not a1:
                xref_bad.append(label)
        elif x:
            ref = f'同数学二（试卷二）第{x.group(2)}' + (f'({x.group(3)})' if x.group(3) else '') + '题'
            q = f'（原题见 {year} 年试卷二第{x.group(2)}' + (f'[{x.group(3)}]' if x.group(3) else '') + '题，本库未收录）'
            a = ''
            xref_bad.append(label)
        where = f'{year} {label}'
        kind = sec['kind']
        qs.append(dict(label=label, kind=kind, pts=pts, sec=sec['num'],
                       q=md_html(q, qb, images, spans, where), a=md_html(a, ab, images, spans, where),
                       key=pick_key(a) if kind == 'c' else '', ref=ref, ch=classify(q, a)))
    # 缺「本题满分」的题：段总分减去已标分的题，余数均分，多出的分给靠后的题（后面的大题通常分值更高）
    for num, idxs in guessed.items():
        sec = next(s for s, _, _ in items if s['num'] == num)
        if not sec['total']:
            continue
        left = sec['total'] - sum(q['pts'] for i, q in enumerate(qs) if q['sec'] == num and i not in idxs)
        if not 3 * len(idxs) <= left <= 20 * len(idxs):
            continue
        base, extra = divmod(left, len(idxs))
        for j, i in enumerate(idxs):
            qs[i]['pts'] = base + (1 if j >= len(idxs) - extra else 0)
    return qs, dict(sections=len(sections), items=len(qs), total=sum(x['pts'] for x in qs), has_sol=has_sol,
                    diag=diag, xref_bad=xref_bad)


YEAR_HEAD = re.compile(r'^# ([〇○零一二三四五六七八九]{4})年考研数学试卷([二三])解答\s*$', re.M)


def load_papers(m1, images, spans):
    docs = {k: fetch(quote_url(RAW_M2, p), CACHE / 'm2' / f'{k}.md') for k, p in M2_DOCS.items()}
    fetch(RAW_M1 + 'LICENSE', CACHE / 'm1-LICENSE')
    papers = []
    text = docs['1987-2019'].read_text(encoding='utf-8')
    heads = list(YEAR_HEAD.finditer(text))
    base = RAW_M2 + M2_DOCS['1987-2019'].rsplit('/', 1)[0] + '/'
    for i, h in enumerate(heads):
        y = cn_num(h.group(1))
        chunk = text[h.end():heads[i + 1].start() if i + 1 < len(heads) else len(text)]
        name = f'{y} 数学二' + ('（原试卷三）' if h.group(2) == '三' else '')
        papers.append((y, name, *paper_questions(y, chunk, base, m1, images, spans)))
    for k in ('2020', '2022', '2023', '2024'):
        y = int(k)
        papers.append((y, f'{y} 数学二', *paper_questions(y, docs[k].read_text(encoding='utf-8'),
                                                          RAW_M2 + M2_DOCS[k].rsplit('/', 1)[0] + '/', m1, images, spans)))
    return sorted(papers, key=lambda p: p[0])


# ---------- 校验 / 入库 / 导出 ----------

def katex_check(spans):
    if not shutil.which('node'):
        print('未找到 node，跳过 KaTeX 校验')
        return []
    r = subprocess.run(['node', str(KATEX_CHECK)], input=json.dumps(spans).encode('utf-8'), capture_output=True)
    if r.returncode:
        sys.exit('KaTeX 校验脚本失败：' + r.stderr.decode('utf-8', 'replace')[:400])
    return json.loads(r.stdout.decode('utf-8'))


def build_db(cards, papers):
    tmp = DB.with_suffix('.tmp')
    tmp.unlink(missing_ok=True)
    con = sqlite3.connect(tmp)
    con.executescript('''
      CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE chapters(idx INTEGER PRIMARY KEY, name TEXT NOT NULL, opens TEXT NOT NULL);
      CREATE TABLE cards(id TEXT PRIMARY KEY, ch INTEGER NOT NULL REFERENCES chapters(idx), sec TEXT, title TEXT NOT NULL,
        imp TEXT, formula TEXT NOT NULL, cond TEXT, tip TEXT, use TEXT, err TEXT, ex TEXT, ord INTEGER);
      CREATE TABLE papers(year INTEGER PRIMARY KEY, name TEXT NOT NULL, total INTEGER, has_sol INTEGER);
      CREATE TABLE questions(id TEXT PRIMARY KEY, year INTEGER NOT NULL REFERENCES papers(year), ord INTEGER NOT NULL,
        label TEXT NOT NULL, kind TEXT NOT NULL, pts INTEGER, ch INTEGER REFERENCES chapters(idx), sec TEXT,
        q TEXT NOT NULL, ans TEXT, key TEXT, ref TEXT);
      CREATE INDEX idx_q_year ON questions(year);
      CREATE INDEX idx_q_ch ON questions(ch);''')
    con.executemany('INSERT INTO chapters VALUES(?,?,?)', [(i, n, d) for i, (n, _, d) in enumerate(CHAPTERS)])
    con.executemany('INSERT INTO cards VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
                    [(c['id'], c['ch'], c['sec'], c['title'], c['imp'], c['formula'], c['cond'], c['tip'], c['use'],
                      c['err'], c['ex'], k) for k, c in enumerate(cards)])
    for y, name, qs, info in papers:
        con.execute('INSERT INTO papers VALUES(?,?,?,?)', (y, name, info['total'], int(info['has_sol'])))
        con.executemany('INSERT INTO questions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
                        [(f'{y}-{q["label"]}', y, k, q['label'], q['kind'], q['pts'], q['ch'], q['sec'], q['q'], q['a'],
                          q['key'], q['ref']) for k, q in enumerate(qs)])
    meta = {'built': datetime.date.today().isoformat(),
            'formula_source': 'ULing19/Codex-for-learning-math handbook/formula-data.js', 'formula_license': 'MIT',
            'paper_source': 'TsekaLuk/Kaoyan-Math2-Papers（2021 为数三，已排除）',
            'xref_source': 'TsekaLuk/Kaoyan-Math1-Papers', 'xref_license': 'CC BY-NC-SA 4.0'}
    con.executemany('INSERT INTO meta VALUES(?,?)', meta.items())
    con.commit()
    con.close()
    tmp.replace(DB)


def line(row):
    return json.dumps(list(row), ensure_ascii=False, separators=(',', ':'))


def export_js():
    con = sqlite3.connect(DB)
    meta = dict(con.execute('SELECT key, value FROM meta'))
    chapters = [{'name': n, 'from': d} for n, d in con.execute('SELECT name, opens FROM chapters ORDER BY idx')]
    cards = con.execute('SELECT id, ch, sec, title, imp, formula, cond, tip, use, err, ex FROM cards ORDER BY ord').fetchall()
    head = {'id': 'math2', 'name': '数二公式', 'source': meta['formula_source'], 'license': meta['formula_license'],
            'built': meta['built'], 'count': len(cards)}
    DECK_JS.write_text(
        '/* 由 math2/build_math2.py 生成，勿手改。公式：ULing19/Codex-for-learning-math（MIT），按数二大纲筛选\n'
        '   cards: [id, ch, sec, title, imp, formula($$…$$), cond, tip, use, err, ex]；文本内数学用 \\(…\\) */\n'
        f'window.DECK_MATH2 = {{meta:{json.dumps(head, ensure_ascii=False)},\n'
        f'chapters:{json.dumps(chapters, ensure_ascii=False)},\ncards:[\n'
        + ',\n'.join(line(r) for r in cards) + '\n]};\n', encoding='utf-8')
    papers = []
    for y, name, total, has_sol in con.execute('SELECT year, name, total, has_sol FROM papers ORDER BY year DESC').fetchall():
        qs = con.execute('SELECT id, label, kind, pts, ch, q, ans, key, ref FROM questions WHERE year=? ORDER BY ord', (y,)).fetchall()
        papers.append(f'{{year:{y},name:{json.dumps(name, ensure_ascii=False)},total:{total},sol:{has_sol},qs:[\n'
                      + ',\n'.join(line(q) for q in qs) + '\n]}')
    nq = con.execute('SELECT COUNT(*) FROM questions').fetchone()[0]
    con.close()
    phead = {'source': meta['paper_source'], 'xref': f'{meta["xref_source"]}（{meta["xref_license"]}）',
             'built': meta['built'], 'papers': len(papers), 'count': nq}
    PAPERS_JS.write_text(
        '/* 由 math2/build_math2.py 生成，勿手改。真题：TsekaLuk/Kaoyan-Math2-Papers；「同试卷一」题由 TsekaLuk/Kaoyan-Math1-Papers\n'
        '   （CC BY-NC-SA 4.0）还原。qs: [id, label, kind(c选择/f填空/a解答), pts, ch, qHTML, ansHTML, key, ref]，ch 同 DECK_MATH2.chapters */\n'
        f'window.PAPERS_MATH2 = {{meta:{json.dumps(phead, ensure_ascii=False)},\npapers:[\n' + ',\n'.join(papers) + '\n]};\n',
        encoding='utf-8')
    return head, phead


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--export-only', action='store_true', help='只从 math2.db 重新导出 JS')
    ap.add_argument('--no-check', action='store_true', help='跳过 KaTeX 校验')
    ap.add_argument('-v', '--verbose', action='store_true', help='逐卷打印诊断')
    a = ap.parse_args()
    if not a.export_only:
        cards, skipped = load_formulas()
        print(f'公式卡 {len(cards)} 张（筛掉 {skipped}）')
        spans = [s for c in cards for f in ('formula', 'cond', 'tip', 'use', 'err', 'ex', 'title')
                 for s in math_spans(c[f], c['id'])]
        images = Images()
        papers = load_papers(M1(), images, spans)
        for y, name, qs, info in papers:
            flag = '' if info['total'] in (100, 150) and not info['diag'] and not info['xref_bad'] else '  ⚠'
            if a.verbose or flag:
                print(f'{y} {len(qs):2d} 题 {info["total"]:3d} 分 解析{"有" if info["has_sol"] else "无"}{flag} '
                      + '；'.join(info['diag'] + ([f'引用未还原 {info["xref_bad"]}'] if info['xref_bad'] else [])))
        if images.missing:
            print(f'图片缺失 {len(images.missing)}：{images.missing[:5]}')
        if not a.no_check:
            bad = katex_check(spans)
            print(f'KaTeX：{len(spans)} 段，失败 {len(bad)}')
            for b in bad[:25]:
                print(f'  [{b["where"]}] {b["msg"]} :: {b["tex"][:90]}')
        build_db(cards, papers)
    head, phead = export_js()
    print(f'完成：{head["count"]} 张公式卡 · {phead["papers"]} 套 {phead["count"]} 题\n  {DB}\n  {DECK_JS}\n  {PAPERS_JS}')


if __name__ == '__main__':
    main()
