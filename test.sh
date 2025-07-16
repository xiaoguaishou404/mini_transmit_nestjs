#!/bin/bash

# 运行单元测试
echo "运行单元测试..."
npm run test

# 如果测试失败，退出脚本
if [ $? -ne 0 ]; then
  echo "单元测试失败，中止部署"
  exit 1
fi

echo "单元测试通过，继续部署测试环境..."

# 启动测试环境容器
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up --build 