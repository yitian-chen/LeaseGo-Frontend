# LeaseGo-Frontend | 公寓租赁管理系统前端

## 项目简介
本项目是 LeaseGo 租赁管理系统的配套前端实现，采用 Monorepo 结构，包含以下两个子项目：
- leasego-admin：后台管理系统，提供房源、租约及用户管理等功能。
- leasego-app：移动端应用，提供房源检索、看房预约及个人中心等功能。

> 后端仓库地址：https://github.com/yitian-chen/LeaseGo

## 目录结构
LeaseGo-Frontend/  
   ├── leasego-admin/      后台管理端 (Vue 3)  
   └── leasego-app/        用户移动端 (Vue 3)  

## 快速开始

1. 环境准备  
   确保本地安装了 Node.js 18.0 或更高版本。建议使用 pnpm 作为包管理工具。

2. 安装依赖  
   在根目录下为所有子项目安装依赖：
    ```bash
   npm install
   ```
   或者分别进入子目录执行 npm install。

3. 配置接口地址  
   在各子项目的 .env.development 文件中，将 VITE_SERVER_URL 修改为后端的运行地址，默认为 http://localhost:8080。

4. 本地运行  
   运行后台管理系统：
    ```bash
   cd leasego-admin
   npm run dev
    ```
    运行移动端应用：
    ```bash
    cd leasego-app
    npm run dev
    ```
5. 访问项目
- 后台管理系统默认访问地址：http://localhost:5173
- 移动端应用默认访问地址：http://localhost:5174