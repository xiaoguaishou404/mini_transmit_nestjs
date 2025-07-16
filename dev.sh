#!/bin/bash

# 启动开发环境容器
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build 