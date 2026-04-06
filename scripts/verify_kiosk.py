import asyncio
from playwright.async_api import async_playwright

async def verify_kiosk():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Navigating to Kiosk...")
        await page.goto("http://localhost:5000/kiosk")
        await asyncio.sleep(5)

        # Check if "Tap to Start" is visible
        btn = page.get_by_text("Tap to Start")
        if await btn.is_visible():
            print("Kiosk Welcome Screen verified.")

        await page.screenshot(path="kiosk_verification.png")
        print("Kiosk screenshot saved.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_kiosk())
