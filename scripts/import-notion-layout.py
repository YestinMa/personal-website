"""从 Notion HTML 导出包读取每个图片块的排版宽度。"""
import argparse
import json
import re
import zipfile
from html.parser import HTMLParser
from pathlib import Path

class Layout(HTMLParser):
    def __init__(self):
        super().__init__()
        self.block = None
        self.widths = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "figure":
            self.block = attrs.get("id", "") if "image" in attrs.get("class", "").split() else None
        if tag == "img" and self.block:
            # 块 ID 而非文件名区分同一张图的多次引用。
            width = re.search(r"(?:^|;)\s*width:\s*(\d+(?:\.\d+)?)px\s*(?:;|$)", attrs.get("style", ""))
            if width and float(width[1]) > 0:
                self.widths[self.block.replace("-", "").lower()] = float(width[1])

    def handle_endtag(self, tag):
        if tag == "figure":
            self.block = None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "notion-layout")
    args = parser.parse_args()
    if args.export.suffix.lower() == ".zip":
        with zipfile.ZipFile(args.export) as archive:
            pages = [(name, archive.read(name)) for name in archive.namelist() if name.lower().endswith(".html")]
    else:
        pages = [(args.export.name, args.export.read_bytes())]
    count = 0
    for name, source in pages:
        page = re.search(r"([0-9a-f]{32})\.html$", name, re.I)
        if not page:
            continue
        layout = Layout()
        layout.feed(source.decode("utf-8-sig"))
        args.output.mkdir(parents=True, exist_ok=True)
        target = args.output / (page[1].lower() + ".json")
        data = json.dumps(layout.widths, sort_keys=True, indent=2) + "\n"
        if not target.exists() or target.read_text(encoding="utf-8") != data:
            target.write_text(data, encoding="utf-8")
        count += 1
        print(f"{page[1]}: {len(layout.widths)} image widths")
    if not count:
        parser.error("没有找到带 Notion 页面 ID 的 HTML 文件")

if __name__ == "__main__":
    main()
