import sys
import zipfile
import xml.etree.ElementTree as ET

def extract_text_from_docx(path):
    with zipfile.ZipFile(path) as docx:
        tree = ET.fromstring(docx.read('word/document.xml'))
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs = []
    for paragraph in tree.findall('.//w:p', namespaces):
        texts = [node.text for node in paragraph.findall('.//w:t', namespaces) if node.text]
        if texts:
            paragraphs.append(''.join(texts))
    return '\n'.join(paragraphs)

with open('extracted_text.txt', 'w', encoding='utf-8') as f:
    f.write(extract_text_from_docx('Avance Proyecto.docx'))
