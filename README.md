## Description

discipline-clock 的后端，用 nestjs 写的

## Installation

```bash
$ npm install
```

## Config

复制配置文件示例，写你自己的配置

```bash
$ cp .env.example .env
$ cp ormconfig.json.example ormconfig.json
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## 注意事项

数据库建表语句我没写，你可以把`ormconfig.json`中的`synchronize`改成 true，这样项目启动的时候就会自动建表了。但是数据库还是得自己先建好，字符集要选`utf8mb4_general_ci`。建表建好后记得把`synchronize`改回 false，不然以后每次`entity`文件有改动都会自动同步到数据库，还是挺蛋疼的。
