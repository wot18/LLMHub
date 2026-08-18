#!/usr/bin/env node
/**
 * LLM Iframe Proxy Server
 * 移除 X-Frame-Options 和 CSP 头，允许 iframe 嵌入
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = process.env.PORT || 8080;

// 需要移除的头
const BLOCKED_HEADERS = [
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'frame-options',
];

function proxyRequest(req, res) {
  try {
    // 解析目标 URL
    const targetUrl = req.url.replace('/proxy/', '');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('请提供目标 URL\n\n使用方式: /proxy/https://example.com');
      return;
    }

    // 规范化 URL
    let urlStr = targetUrl;
    if (!urlStr.startsWith('http')) {
      urlStr = 'https://' + urlStr;
    }

    console.log(`[Proxy] ${req.method} ${urlStr}`);

    const targetUrlObj = new URL(urlStr);
    
    const options = {
      hostname: targetUrlObj.hostname,
      port: targetUrlObj.port || (targetUrlObj.protocol === 'https:' ? 443 : 80),
      path: targetUrlObj.pathname + targetUrlObj.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrlObj.hostname,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept: req.headers.accept || '*/*',
      },
    };

    const transport = targetUrlObj.protocol === 'https:' ? https : http;

    const proxyReq = transport.request(options, (proxyRes) => {
      // 复制响应头，但移除受限的头
      const responseHeaders = {};
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        const lowerKey = key.toLowerCase();
        if (!BLOCKED_HEADERS.includes(lowerKey)) {
          responseHeaders[key] = value;
        }
      }
      // 添加允许嵌入的头
      responseHeaders['x-frame-options'] = 'ALLOWALL';
      responseHeaders['content-security-policy'] = "frame-ancestors '*'";
      
      res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('代理错误: ' + err.message);
      }
    });

    req.pipe(proxyReq);
  } catch (err) {
    console.error('[Error]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('服务器错误');
    }
  }
}

const server = http.createServer(proxyRequest);

server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  LLM Proxy 已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`\n使用方式:`);
  console.log(`  http://localhost:${PORT}/proxy/https://chat.deepseek.com`);
  console.log(`  http://localhost:${PORT}/proxy/chat.deepseek.com\n`);
  console.log(`按 Ctrl+C 停止服务器\n`);
});
