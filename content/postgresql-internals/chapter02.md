---
title: "Chapter 2. Process And Memory Architecture"
---

2장에서는 PostgreSQL prcoess 구조와 메모리 구조에 대해 알아볼 것 입니다. 2장의 내용을 잘 이해하면 이후 챕터에서 배우게 될 내용에 큰 도움이 될 것이니 잘 숙지하면 좋을 것 같습니다.  

---
## 2.1. Process Architecture 

PostgreSQL 은 client/server 모델을 사용하는 관계형 데이터베이스로 내부적으로 여러 프로세스가 단일 호스트에서 동작하고 있습니다. 일반적으로 하나의 데이터베이스 클러스터를 운영하는 여러 프로세스의 집합을 'PostgreSQL' 이라고 하며 이를 구성하는 프로세스들은 크게 다음과 같습니다. 

* postgres server process : 서버프로세스는 데이터베이스 파일을 관리하고, client application 에서 서버에 연결을 요청할 때 그 요청을 처리 (수락 or 거부) 하고 클라이언트들이 데이터베이스를 사용할 수 있도록 기반작업을 준비합니다. 서버프로세스는 데이터베이스 클러스터 운영에 관련된 모든 프로세스의 부모 프로세스 입니다.  

* backend process : backend process 는 client 가 요청한 SQL 및 command 를 처리하는 process 로 client 와 연결이 끊어지면 해당 프로세스도 종료되게 됩니다. postgres server process (postmaster)에서 fork 되며 client 와의 connection 갯수만큼 프로세스가 생성되게 됩니다. 

* background processes : 데이터베이스 운영에 필요한 다양한 프로세스들이 background 에서 동작하고 있습니다. 이는 postgreSQL 동작에 필수적인 부분으로 우리는 이후 챕터에서 VACCUME, CHECKPOINT 프로세스 등에 대하여 배울 것입니다. 

<figure>
  <img
    src="https://www.interdb.jp/pg/img/fig-2-01.png"
    alt="process architecture in PostgreSQL"
    style="display: inline-block; margin: 0 auto; width: 1024px"
  />
  <figcaption style="text-align: center">Fig 2.1 - An example of the process architecture in PostgreSQL</figcaption>
</figure>

## 2.1.1 Postgres Server Process 

PostgreSQL 서버를 가동/중지 시키기 위한 필수 process 로 가장 먼저 시작되는 process 로 'postmaster' 라고 불리기도 합니다.
 주요기능으로 아래와 같은 기능을 수행합니다. 

 - SharedMemory 영역을 할당하며 다양한 background 프로세스를 시작합니다. 
 - Client 의 연결 요청을 처리(수락 or 거부) 하고 연결을 맺을 시 client 를 위한 postgres backend 포르소세를 생성합니다. 
 - 가장 상위 프로세스로서 하위 프로세스의 비정상 작동유무를 체크하며 문제 발생시 재기동하는 역할을 수행합니다.  
 
postgres 에서 제공하는 pg_ctl 유틸리티를 start 옵션을  start up 을 수행할 수 있습니다. 

## 2.1.2 Postgres Backend Process

단일 client 로부터 요청받은 SQL 및 command 를 처리하는 프로세스로 'postgres' 불립니다. client 로부터 연결 요청이 있을 때 postgres server process (postmaster)에서 fork 되며 client 와의 connection 갯수만큼 프로세스가 생성되게 됩니다. client 와는 TCP/IP 네트워크 기반으로 통신하게 되고 client 와의 연결이 끊어지면 해당 프로세스도  종료됩니다. postgreSQL 에서 max_conniections 파라미터를 이용하여 connection 갯수를 조절 할 수 있으며 default maximum 값은 100 입니다. 

PostgreSQL 서버의 경우 내부적으로 connection 에 대한 pooling 기능을 구현해 놓지 않았습니다. 따라서 Web application 같은 외부 client 에서 빈번하게 connection을 맺고 끊는 동작을 반복하면, PostgreSQL server 내부적으로 요청이 올 때마다 connection 을 생성하고 메모리를 할당하는 작업을 반복적으로 수행합니다. 이는 PostgreSQL server 입장에서 cost 가 꽤 큰 작업으로 데이터베이스 성능저하를 유발하게 됩니다. 이를 해결하기 위해서 내부적으로 pooling 을 가능하도록 하는 pgbouncer 나 pgpool-II 같은 extension 을 사용하길 권장합니다.  

## 2.1.3 Postgres Background Process

아래 테이블은 background process 리스트입니다. 각각의 프로세스는 PostgreSQL 에서 중요한 기능을 담당하고 있어 여기서 자세히 설명하긴 어렵습니다. 이 장에서는 간단한 소개만 자세한 내용은 옆에 각주로 달아놓은 장에서 설명합니다.  

### Background process
    
|process|description|references|
|:---|:---|:---|
|background writer |  Background 프로세스는 Shared buffer 에 저장되어있던 Dirty page 를 디스크에 기록하는 프로세스입니다. (데이터에 변경이 발생하였으나 디스크로 저장되지 않은 페이지를 우리는 dirty page 라고 부릅니다.) 자세한 기능은 이후 chapter8.6 에서 더 자세히 다루도록 하겠습니다. | section 8.6 |
|checkpointer |checkpoint 를 수행하는 프로세스로 PostgreSQL 9.2 버전에 추가되었습니다. 9.1 버전 이하에서는 background writer 가 주기적으로 checkpointer 를 수행하였으나, 9.2 버전부터 Checkpointer 프로세스가 추가되면서 해당기능이 background writer 로부터 분리되었습니다. | section 9.7 |
|autovaccum launcher | autovaccum-worker 프로세스는 vacuum 프로세스를 위해 주기적으로 호출됩니다. (정확히는 postgres 서버에 auvacuum worker 생성을 요청합니다.) vaccum 에 데헤서도 chapter 6 에서 더 자세히 다루도록 하겠습니다.  | section 6.5 |
|WAL writer |WAL Buffer (Write Ahead Log/Xlog) 를 주기적으로 확인하여 기록되지 않은 트랙잭션 레코드를 디스크(WAL파일) 에 기록하는 프로세스 입니다. WAL writer 는 트랙잭션 Commit 혹은 로그파일 공간이 다 찼을 때 WAL Buffer 를 디스크에 내려쓰며 WAL 파일은 데이터베이스 recovery 에 사용됩니다. | section 9.9 |
|statistics collector|PostgreSQL 의 Database 통계정보를 수집하는 프로세스입니다. Session 정보 (pg_stat_activity) 및 테이블 통계정보 (pg_stat_all_tables) 와 같은 DBMS 사용통계를 수집하여 pg_catalog 에 업데이트합니다. |  |
|logger (logging collector)|오류메시지를 로그파일에 기록하는 프로세스입니다. Background process, Backend process, Server process 에 대한 정보를 기록하며 모든 프로세스는 $PGDATA/pg_log 아래 저장됩니다.|  |
|archiver| Archving 을 수행하는 프로세스로 WAL 세그먼트가 전환될 때, WAL 파일을 Archive 영역으로 복사하는 동작을 수행합니다.|  |

아래 이미지는 PostgreSQL server 의 실제 프로세스를 조회해 본 것 입니다. 하나의 postgres server process (pid 9687) 이 존재하고 두개의 backend process (pid 9697, 9718) 그리고 2.1.3 에서 살펴보았던 background process 들로 이루어진 Database Cluster 가 동작하고 있음을 확인해 볼 수 있습니다.   

```bash
postgres> pstree -p 9687
\-+= 00001 root /sbin/launchd
 \-+- 09687 postgres /usr/local/pgsql/bin/postgres -D /usr/local/pgsql/data
   |--= 09688 postgres postgres: logger process     
   |--= 09690 postgres postgres: checkpointer process     
   |--= 09691 postgres postgres: writer process     
   |--= 09692 postgres postgres: wal writer process     
   |--= 09693 postgres postgres: autovacuum launcher process     
   |--= 09694 postgres postgres: archiver process     
   |--= 09695 postgres postgres: stats collector process     
   |--= 09697 postgres postgres: postgres sampledb 192.168.1.100(54924) idle  
   \--= 09717 postgres postgres: postgres sampledb 192.168.1.100(54964) idle in transaction  
```

 ## 2.1. Memory Architecture 

 PostgreSQL 의 Memory 구조는 Local memory Area , Shared memory Area 두가지로 구분될 수 있습니다. Shared Memory 란 Data Blcok 및 트랜잭션 로그와 같은 정보를 캐싱하는 공간으로 PostgreSQL Server 의 모든 프로세스와 공유되는 영역이기도 합니다. 이와 별개로 프로세스별로 할당되어 공유가 불가능한 Local Memory 영역이 존재하는데 주로 query, vacuum 등의 동작을 수행하기 위한 목적으로 사용됩니다. 데이터베이스를 운영할 때 데이터의 종류와 운영 방식에 따라 메모리 영역할당과 매개변수 조절을 달리 할당해 주어야 하기 때문에 Memory 구조를 이해하는 것은 중요합니다. 이번 섹션에서는 각 메모리 영역에서 어떤 동작을 하는지에 대하여 간단하게 알아보도록 하겠습니다. 

<figure>
  <img
    src="https://www.interdb.jp/pg/img/fig-2-02.png"
    alt="Memory architecture in PostgreSQL"
    style="display: inline-block; margin: 0 auto; width: 1024px"
  />
  <figcaption style="text-align: center">Fig 2.2 - Memory architecture in PostgreSQL</figcaption>
</figure>

## 2.2.1. Local Memory Area 

개별 backend 프로세스가 할당 받아 사용하는 공간으로 query 를 수행하기 위한 목적으로 사용됩니다.  Local memory Area의 수치는 개별 공간의 크기를 의미하므로 Connection 갯수를 고려하여 할당해야 합니다. 기본적으로 Local Memory 는 session 단위로 할당되지만 트랜잭션 단위로 임의로도 조정이 가능합니다. 

```sql
/* 세션 단위 work 메모리 조정 */
SET work_mem = '16MB';

/* 트랜잭션 단위 메모리 조정 */
SET LOCAL wrok_mem = '16MB';

/* 설정 reset */
RESET work_mem
```

### Local memory area
    
|sub-area|description|references|
|:---|:---|:---|
|Work Memory| Executor 에서 Sort/Hash 동작을 수행할 때, Temp 파일을 사용하기 전에 사용하는 메모리 공간으로 default 값은 4MB 입니다. Sort 작업에는 ORDER BY, DISTICT, MERGE JOIN 등이 있고 Hash 동작에는 HASH JOIN, HASH AGGREGATION, IN SUBQUERY 등이 포함됩니다. chapter3 에서 더 자세히 다루겠지만 Sort/Hash 동작은 빈번하게 발생할 수 있고 여러 Session 에서 과도한 Sort/Hash 연산을 수행할 경우 문제가 발생할 수 있으니 주의가 필요합니다.   | chapter3|
|Maintenance Work Memory| PostgreSQL 에서 vacuum 관련작업, 인덱스 생성, 테이블 변경, Foreign Key 추가 등 데이터베이스 유지 관리 작업에 사용되는 메모리로 기본값은 64MB 입니다. vacuum 관련해서는 추후 챕터에서 다루게 될테니 이번 장에서는 Maintenance Work Memory 영역의 역할에 대해서만 숙지하면 좋을 것 같습니다. | chapter6.1|
|Temp Buffer Memory| Temporary 테이블에 사용되는 공간으로 default 값은 8 MB 입니다. temp 테이블을 사용할 때에만 할당되며 Session 단위로 할당되는 비공유 메모리 영역이므로 과도하게 Temp Table 사용시 문제가 될 수 있습니다. | |
|Catalog Cache| System Catalog의 메타데이터를 이용할 때 사용하는 메모리 영역입니다. 각 세션에서 메타데이터를 조회하는 경우가 빈번하고 그때마다 디스크에서 읽을 경우 데이터베이스의 성능저하가 발생할 수 있기 때문에 개별 메모리 공간을 활용합니다. | |
|Optimizer & Excutor| Cahpter 3 에서 더 자세히 다루겠지만 PostgreSQL 에서 Query 를 수행할 최적의 plan 을 찾고 이를 수행하는 역할은 Planner 와 Excutor 가 담당합니다. Planner 와 Excutor 가 동작할 때 필요한 메모리 공간으로 Local memory Area 에 할당되어 수행합니다. |chapter3 |

 ## 2.2.2. Shared Memory Area 

Shared Memory Area 는  데이터를 읽거나 변경하기 위해 사용하는 공용 메모리 영역으로 PsotgreSQL server 가 시작될 때 시스템 메모리에서 할당받으며 종료될 때 다시 시스템 메모리 영역으로 반환됩니다. 이에 대한 자세한 설명을 아래 표에 정리해 놓았습니다.    

### Shared memory area
|sub-area|description|references|
|:---|:---|:---|
|Shared Buffer pool|Data 와 Data 의 변경사항을 page 단위로 캐싱하여 I/O 를 빠르게 처리하기 위한 영역입니다. Default 값으로 128MB 로 설정되어있지만 postgresql.conf 의 shared buffers 라는 파라미터를 이용하여 크기를 설정할 수 있고 1GB 이상의 RAM 이 있는 서버의 경우 시스템메모리의 25% 를 권장합니다. Shared buffer 에 기록되는 단위는 우리가 chapter 1 에서 배웠던 page_size 단위 와 동일합니다.(default 8K) Shared buffer 를 사용하는 내부동작에 대해서는 chapter 8 에서 더 자세히 다뤄볼 것 입니다.  |chapter 8|
|WAL buffer|각 session 에서 수행되는 트랜잭션에 대한 변경 로그를 캐싱하는 공간으로 recovery 작업 수행 시 Data를 재구성 할 수 있도록 하는 영역입니다. 역시 postgresql.conf 의 WAL buffers 파라미터로 그 크기를 설정할 수 있습니다. WAL buffer를 이용하는 내부동작도 추후 chapter 9에서 더 자세히 다뤄볼 것 입니다.  |chapter 9|
|Commit log Buffer|각 트랜잭션의 상태(in_progress, committed, aborted) 정보를 캐싱하는 공간으로 모든 트랜잭션의 상태가 있으며 완료 여부를 확인할 수 있도록 하는 영역입니다. 따로 사이즈를 설정할 수 있는  Parameter 는 없으며 데이터베이스 엔진에 의해 자동관리됩니다. Commit log 를 이용한 PostgreSQL 의 Concurrency Control 은 추후 chapter 5.4 에서 더 자세히 다뤄보도록 하겠습니다. |chapter 5.4|
