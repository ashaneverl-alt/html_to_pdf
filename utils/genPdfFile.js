const puppeteer = require('puppeteer');
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const path = require('path');
let browserInstance;

async function getBrowserInstance() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browserInstance;
}

async function generatePDFFromHTML(htmlString) {
    console.log("generatePDFFromHTML");

    try {
        const browser = await getBrowserInstance();
        const page = await browser.newPage();
        
        let headerTemplate = "";
        let footerTemplate = "";
        let updatedHtmlString = htmlString;
        
        // 构建页眉
        {
            let dom = new JSDOM(htmlString);
            let document = dom.window.document;
            const elementsToRemove = document.querySelectorAll(".page_start");
            if (elementsToRemove.length > 0) {
                headerTemplate = elementsToRemove[0].outerHTML;
            }
            elementsToRemove.forEach(el => el.parentNode.removeChild(el));  
            updatedHtmlString = dom.serialize();
        }
    
        // 构建页脚
        {
            let dom = new JSDOM(updatedHtmlString);
            let document = dom.window.document;
            const endelementsToRemove = document.querySelectorAll(".page_end");
            if (endelementsToRemove.length > 0) {
                footerTemplate = endelementsToRemove[0].outerHTML;
            }
            endelementsToRemove.forEach(el => el.parentNode.removeChild(el));  
            updatedHtmlString = dom.serialize();
        }
        
        // Embed local resources: images as base64, CSS as inline styles, JS as inline scripts
        {
            let domRes = new JSDOM(updatedHtmlString);
            let documentRes = domRes.window.document;
            
            // Handle local CSS
            const linkElements = documentRes.querySelectorAll('link[rel="stylesheet"]');
            for (let link of linkElements) {
                let href = link.getAttribute('href');
                if (href && !href.startsWith('http://') && !href.startsWith('https://')) {
                    const filePath = path.isAbsolute(href) ? href : path.resolve(process.cwd(), href);
                    if (fs.existsSync(filePath)) {
                        const cssContent = fs.readFileSync(filePath, 'utf8');
                        const styleTag = documentRes.createElement('style');
                        styleTag.textContent = cssContent;
                        link.parentNode.insertBefore(styleTag, link);
                        link.remove();
                    } else {
                        console.warn(`Local CSS not found: ${filePath}`);
                    }
                }
            }
            
            // Handle local JS
            const scriptElements = documentRes.querySelectorAll('script[src]');
            for (let script of scriptElements) {
                let src = script.getAttribute('src');
                if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
                    const filePath = path.isAbsolute(src) ? src : path.resolve(process.cwd(), src);
                    if (fs.existsSync(filePath)) {
                        const jsContent = fs.readFileSync(filePath, 'utf8');
                        script.textContent = jsContent;
                        script.removeAttribute('src');
                    } else {
                        console.warn(`Local JS not found: ${filePath}`);
                    }
                }
            }
            
            // Handle local images
            const imgElements = documentRes.querySelectorAll('img');
            for (let img of imgElements) {
                let src = img.getAttribute('src');
                if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                    const filePath = path.isAbsolute(src) ? src : path.resolve(process.cwd(), src);
                    if (fs.existsSync(filePath)) {
                        const buffer = fs.readFileSync(filePath);
                        const ext = path.extname(filePath).slice(1).toLowerCase();
                        const mimeTypes = {
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'gif': 'image/gif',
                            'bmp': 'image/bmp',
                            'svg': 'image/svg+xml',
                            'webp': 'image/webp'
                        };
                        const mime = mimeTypes[ext] || 'image/jpeg';
                        const base64 = buffer.toString('base64');
                        img.setAttribute('src', `data:${mime};base64,${base64}`);
                    } else {
                        console.warn(`Local image not found: ${filePath}`);
                    }
                }
            }
            
            updatedHtmlString = domRes.serialize();
        }
        
        // 设置内容并等待所有资源加载完成
        await page.setContent(updatedHtmlString, {
            waitUntil: ['load', 'networkidle0'],  // 网络空闲即可认为静态资源已就位
            timeout: 30000
        });

        // 给可能存在的 Canvas/SVG/图片等 JS 渲染内容留一点时间
        // 1. 如果页面有 canvas 或 svg，稍微多等一会儿
        const hasDynamicElements = await page.evaluate(() => {
            return document.querySelectorAll('canvas, svg').length > 0;
        });

        if (hasDynamicElements) {
            console.log("检测到 canvas 或 svg，额外等待动态内容渲染...");
            // 最多等 3 秒
            await page.waitForTimeout(3000);
        } else {
            console.log("页面为纯静态内容，无需额外等待");
            // 纯静态页面可以再快一点
            await page.waitForTimeout(500);
        }

        const pdfOptions = {
            format: 'a4',
            displayHeaderFooter: true,
            headerTemplate,
            footerTemplate,
            margin: {
                top: '60px',
                bottom: '20px',
                left: '20px',
                right: '50px'
            },
            printBackground: true,
        };
        
        const pdfBuffer = await page.pdf(pdfOptions);
        
        await page.close();
        
        return pdfBuffer;
    } catch (error) {
        console.error('生成PDF错误:', error);
        throw error;
    }
}

module.exports = {
    getBrowserInstance,
    generatePDFFromHTML
};
