# iFuyun

## 介绍
iFuyun是基于Node.js和MySQL开发的博客系统。在线体验，请访问：[抚云生活](http://www.ifuyun.com/ "抚云生活")。

## 安装

### 前置条件
1. Node.js
2. MySQL
3. Redis

### 配置
1. 执行npm install
2. 修改/config/core.js、/config/database.js和/config/redis.js等相关配置信息

### 文档生成
1. 执行npm install -g yuidocjs
2. 执行yuidoc -c yuidoc.json

## 注意事项
1. 百度、谷歌等帐号验证和静态文件存放在/public/page目录下
2. favicon.ico存放在/public目录
3. API文档在/views/doc目录
4. 日志信息在/logs
5. 其他静态资源路由参照Nginx配置

## TODO
1. ES6改版
2. 静态资源构建、部署
3. 文章访问权限控制
4. 日志系统完善
5. RSS订阅
6. 相册
7. 表情支持
8. 监控、报警支持
9. 消息通信
10. ……

## License
GPL