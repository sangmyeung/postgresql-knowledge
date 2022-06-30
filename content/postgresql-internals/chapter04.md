---
title: "Chapter 4. Foreign Data Wrappers"
---
## 4.1. Foreign Data Wrappers (FDW)

- foreign table : **remote** server에 있는 table(in SQL Management of External Data, SQL/MED)
- PostgreSQL’s FDW : local table과 유사한 foreign table을 manage 하기위해 SQL/MED를 사용하는것

![**Basic concept of FDW**](https://www.interdb.jp/pg/img/fig-4-fdw-1.png)

**Basic concept of FDW**

- 필요 extension과 적절한 환경설정 후 remove server들의 foreign table에 접근 가능
- local table과 유사한 다른 서버에 저장된 foreign table과 join 연산 수행 가능


### 4.1.1. Overview

- FDW feature 사용시 적절한 extension 설치, setup command([CREATE FOREIGN TABLE](https://www.postgresql.org/docs/current/static/sql-createforeigntable.html), [CREATE SERVER](https://www.postgresql.org/docs/current/static/sql-createserver.html) and [CREATE USER MAPPING](https://www.postgresql.org/docs/current/static/sql-createusermapping.html)) 실행 필요
- 환경설정 후 query processing 동안 foreign table에 접근하기 위해 extension에 정의된 함수 호출

![How FDWs perform](https://www.interdb.jp/pg/img/fig-4-fdw-2.png)

How FDWs perform

(1) analyzer/analyser 가 input SQL 의 query tree 생성

(2) planner (or executor)가 remote server에 연결

(3) [use_remote_estimate](https://www.postgresql.org/docs/current/static/postgres-fdw.html#id-1.11.7.43.10.4) 옵션이 활성화 되면(default 비활성화) planner는 각 plan path의 cost 계산을 위해 EXPLAIN 명령 수행

(4) planner는 내부적으로 deparsing이라 불리는 plan tree에서 plain text SQL문 생성

(5) executor는 plain text SQL문을 remote server에 보내고 결과 수신

- 그 후 필요시 executor는 수신 data 처리
- ex) multi-table query가 실행되면 executor는 수신 data와 다른 테이블 들을 join 수행

**4.1.1.1 Creating a Query Tree**

- analyzer/analyser 는 [CREATE FOREIGN TABLE](https://www.postgresql.org/docs/current/static/sql-createforeigntable.html) 또는 [IMPORT FOREIGN SCHEMA](https://www.postgresql.org/docs/current/static/sql-importforeignschema.html) 명령을 사용해 [pg_catalog.pg_class](https://www.postgresql.org/docs/current/static/catalog-pg-class.html) 와 [pg_catalog.pg_foreign_table](https://www.postgresql.org/docs/current/static/catalog-pg-foreign-table.html) catalog에 저장된 foreign table의 정의를 사용하는 input SQL의 query tree를 생성

**4.1.1.2. Connecting to the Remote Server**

- planner(or executor)는 remote database server에 연결하는 특정 라이브러리를 사용해 remote server와 연결
- ex) remote PostgreSQL server에 연결시 postgres_fdw는 [libpq](https://www.postgresql.org/docs/current/static/libpq.html) 사용, remote mysql server에 연결시 [mysql_fdw](https://github.com/EnterpriseDB/mysql_fdw)는 libmysqlclient사용
- 연결 paratemters(username, 서버 IP 주소, 포트넘버)는 [CREATE USER MAPPING](https://www.postgresql.org/docs/current/static/sql-createusermapping.html) 와 [CREATE SERVER](https://www.postgresql.org/docs/current/static/sql-createserver.html) 명령을 사용해 [pg_catalog.pg_user_mapping](https://www.postgresql.org/docs/current/static/catalog-pg-user-mapping.html)
 and [pg_catalog.pg_foreign_server](https://www.postgresql.org/docs/current/static/catalog-pg-foreign-server.html) catalog에 저장

**4.1.1.3. Creating a Plan Tree Using EXPLAIN Commands (Optional)**

- PostgreSQL의 FDW는 FDW extension(postgres_fdw, mysql_fdw, tds_fdw and jdbc2_fdw) 에서 사용되는 query의 plan tree를 추정하는 foreign table의 통계를 얻는 feature를 도움
- *use_remote_estimate* 옵션이 **[ALTER SERVER](https://www.postgresql.org/docs/current/static/sql-alterserver.html) 명령을 사용하도록 설정 되면 planner quey들은 EXPLAIN 명령을 실행해서 remote server의 plan 비용을 query 함, 그렇지 않은 경우 내재된 상수값을 기본값으로 사용
- PostgreSQL의 EXPLAIN 명령은 start-up 과 전체 비용을 반환하기 때문에 postgres_fdw 만 EXPLAIN 명령 결과를 반환, 몇몇 extension 들은 EXPLAIN 명령 값 사용
- planning을 위한 다른 DBMS fdw extension 들은 EXPLAIN 명령 결과를 사용하지 않음(mysql의 EXPLAIN 명령은 행의 추정된 갯수만 반환, PostgreSQL의 [planner](https://www.interdb.jp/pg/pgsql03.html) 는 비용 추정에 더 많은 정보 필요)
- mysql_fdw사용은 query tree에서 MySQL의 SELECT text를 재생성
- [redis_fdw](https://github.com/pg-redis-fdw/redis_fdw) or [rw_redis_fdw](https://github.com/nahanni/rw_redis_fdw) 의 사용은 [SELECT command](https://redis.io/commands/select) 생성

**4.1.1.4. Deparesing**

- plan tree 생성시 planner는 foreign table의 plan tree's scan paths 에서 plain text SQL문을 생성
- deparsing(in PostgreSQL) : postgre_fdw가 parsing과 analysing을 통해 생성된 query tree에서 plain SELECT text를 재생성
    
    ![**Example of the plan tree that scans a foreign table**](https://www.interdb.jp/pg/img/fig-4-fdw-3.png)
    
    **Example of the plan tree that scans a foreign table**
    

**4.1.1.5 Sending SQL Statements and Receiving Result**

- deparsing 후 executor 는 remote server에 deparseing된 SQL 문을 보내고 결과 받음
- remote server에 SQL문을 보내는 방법은 각 extension의 developer 마다 상이함(mysql_fdw는 트랜잭션사용 없이 SQL문 전송)
- mysql_fdw에서 SELECT query를 실행하는 SQL문의 전형적 순서

![**Typical sequence of SQL statements to execute a SELECT query in mysql_fdw**](https://www.interdb.jp/pg/img/fig-4-fdw-4.png)

**Typical sequence of SQL statements to execute a SELECT query in mysql_fdw**

(5-1) SQL_MODE를 ‘ANSI_QUOTES’로 설정

(5-2) SELECT문을 remote 서버로 보냄

(5-3) remote 서버에서 결과 수신, mysql_fdw는 그 결과를 PostgreSQL이 읽을 수 있는 데이터로 변환, 모든 FDW extension은 PostgreSQL이 읽을 수 있는 데이터로 변환한 특징들을 구현함

![**Typical sequence of SQL statements to execute a SELECT query in postgres_fdw**](https://www.interdb.jp/pg/img/fig-4-fdw-5.png)

**Typical sequence of SQL statements to execute a SELECT query in postgres_fdw**

- postgres_fdw에서 SQL문의 순서는 복잡하다, postgres_fdw에서 SELECT query를 수행하는 SQL문의 전형적 순서

(5-1) remote transaction 시작, 초기 remote transaction isolation level은 REPEATABLE READ; local transaction의 isolation level 이 SERIALIZABLE 으로 설정 되면, remote transaction도 SERIALIZABLE로 설정 됨

(5-2)-(5-4) cursor 선언, SQL문은 기본적으로 cursor가 실행함

(5-5) 그 결과를 얻기 위해 FETCH 명령 실행, 초기값으로 100개의 row가 FETCH 명령에 의해 fetch됨

(5-6) remote 서버에서 결과를 수신

(5-7) cursor를 닫음

(5-8) remote transaction을 커밋

### 4.1.2. How the Postgres_fdw Extension Performs

- postgres_fdw 와 FDW feature는 distributed lock manager와 distributed deadlock detection feature를 지원하지 않음
    - deadlock 쉽게 발생
    - ex) Client_A가 tbl_local(local table) tbl_remote(foreign table) update, Client_B가 tbl_remote, tbl_local update시, 두 트랜잭션 deadlock, PostgreSQL 은 감지 불가 ⇒ transaction commit 불가

**4.1.2.1. Multi-Table Query**

- multi-table query 실행시, postgre_fdw는 single-table SELECT 문을 사용해 각 foreign table을 fetch해 local server에 join
- ~ Ver.9.5
    - row를 받아서 executor는 tbl_a와 tbl_b row를 둘 다 받아 정렬된 row들과 merge join 실행
    

![**Sequence of SQL statements to execute the Multi-Table Query in version 9.5 or earlier**](https://www.interdb.jp/pg/img/fig-4-fdw-6.png)

**Sequence of SQL statements to execute the Multi-Table Query in version 9.5 or earlier**

- Ver. 9.6 ~
    - use_remote_estimate option 사용시 postgre_fdw는 foreign table과 관련된 모든 plan의 비용을 구해 EXPLAIN 명령들을 보냄
    - EXPLAIN 명령들을 보내기 위해 postgres_fdw는 각 single-table query의 EXPLAIN 명령과 remote join을 수행하는 SELECT문의 EXPLAIN 명령 전송

![**Sequence of SQL statements to execute the remote-join operation in version 9.6 or later**](https://www.interdb.jp/pg/img/fig-4-fdw-7.png)

**Sequence of SQL statements to execute the remote-join operation in version 9.6 or later**

**4.1.2.2. Sort Operations(ORDER BY)**

- ~ Ver.9.5
    - local server는 remote servier에서 모든 target row를 fetch 해 sort operation 후 local server에서 처리
- Ver. 9.6 ~
    - postgres_fdw는 가능하면 remote server에서 실행

**4.1.2.3. Aggregate Functions(AVG(), COUNT())**

- ~ Ver.9.6
    - local server에서 처리
    - 많은 row 전송은 network traffic이 많고 오랜 시간 소요
- Ver. 10 ~
    - postgres_fdw는 가능하면 remote server에서 실행
