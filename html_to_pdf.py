#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import asyncio
from pathlib import Path

HTML_FILE = r'C:\Users\User10\jarvis-bot\marketing-plan.html'
PDF_FILE  = r'C:\Users\User10\jarvis-bot\marketing-plan-demo-v3.pdf'

async def convert():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Загружаем HTML из файла
        html_url = Path(HTML_FILE).as_uri()
        await page.goto(html_url, wait_until='networkidle', timeout=30000)

        # Ждём загрузки шрифтов Google Fonts (если нет — fallback Segoe UI)
        await asyncio.sleep(1.5)

        # Экспорт в PDF — A4, без полей (они уже в HTML)
        await page.pdf(
            path=PDF_FILE,
            format='A4',
            print_background=True,
            margin={'top': '0mm', 'bottom': '0mm', 'left': '0mm', 'right': '0mm'},
            prefer_css_page_size=False,
        )

        await browser.close()
        size = os.path.getsize(PDF_FILE) / 1024
        print(f'PDF saved: {PDF_FILE}  ({size:.0f} KB)')

asyncio.run(convert())
