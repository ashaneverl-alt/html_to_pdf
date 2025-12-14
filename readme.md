# 使用说明书
## 1.概述
该服务提供了两个接口，允许用户将 HTML 文本或 HTML 文件转换为 PDF 文件。服务监听在指定的端口上（默认为 10030）。
## 安装依赖
```
npm install
```
## 启动
```
node main.js
```
## 调用方式
```
## 2.接口描述
### 2.1 /html-to-pdf (将 HTML 文本转换为 PDF)
- 方法: POST
- Content-Type: text/plain
- 请求体: HTML 字符串
- 响应: PDF 文件
- 错误处理: 如转换失败，返回状态码 500 和错误信息

请求示例：
```
curl -X POST http://localhost:10030/html-to-pdf \
     -H "Content-Type: text/plain" \
     -d "<html><body><h1>您好</h1></body></html>" \
     --output document.pdf
```

### 2.2 /htmlfile-to-pdf (将 HTML 文件转换为 PDF)
- 方法: POST
- Content-Type: text/plain
- 请求体: HTML 字符串
- 响应: PDF 文件
- 错误处理: 如转换失败，返回状态码 500 和错误信息
请求示例：
```
curl -X POST http://localhost:10030/htmlfile-to-pdf \
     -F "file=@path_to_html_file.html" \
     --output document.pdf
```

## 注意事项
- 确保服务正常运行并能够访问指定的端口。
- 当发送 HTML 文件时，确保文件内容是有效的 HTML。
- 如果转换失败，请检查 HTML 内容是否符合标准。
