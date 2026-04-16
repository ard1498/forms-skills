#!/usr/bin/env python3
"""
docx-to-text: Extracts plain text from a .docx file.

Usage:
    python3 docx-to-text.py <path-to-docx>

Output:
    Plain text printed to stdout. Paragraphs separated by newlines,
    table cells separated by tabs.
"""

import sys
import zipfile
import re


def docx_to_text(path: str) -> str:
    with zipfile.ZipFile(path) as z:
        with z.open("word/document.xml") as f:
            content = f.read().decode("utf-8")

    text = re.sub(r"<w:br[^/]*/?>", "\n", content)
    text = re.sub(r"</w:p>", "\n", text)
    text = re.sub(r"</w:tr>", "\n", text)
    text = re.sub(r"</w:tc>", "\t", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = (
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
            .replace("&#xA;", "\n")
    )
    return text.strip()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 docx-to-text.py <path-to-docx>", file=sys.stderr)
        sys.exit(1)

    docx_path = sys.argv[1]

    try:
        print(docx_to_text(docx_path))
    except FileNotFoundError:
        print(f"Error: File not found: {docx_path}", file=sys.stderr)
        sys.exit(1)
    except KeyError:
        print(f"Error: Not a valid .docx file: {docx_path}", file=sys.stderr)
        sys.exit(1)
