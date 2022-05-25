# Chapter 1. Data Layout
1장에서는 PostgreSQL이 data를 어떤 구조로 관리하는지 간략하게 살펴보겠습니다. Data가 논리적인 level에서 어떻게 관리되고 있고, 그리고 그것들이 OS level에서 어떻게 mapping 되는지 살펴봅니다. 조금 더 나아가 data가 저장되는 기본 단위인 block에 대해 소개하고 block에 대한 read/write가 어떤 방식으로 처리되는지 살펴봅니다. 

Home 화면에서도 언급했지만 해당 요약은 Hironobu Suzuki의 blog "The Internals of PostgreSQL"를 기반으로 작성된 내용인 점을 다시 한번 말씀드립니다.

## 1.0. TL;DR :shrug:
- Database는 database object들의 collection이다.
  - Database 자체도 database object이며 object id를 발급받는다.
  - 하나의 PG server instance에서 여러 개의 database를 가질 수 있다. 
  - Database의 묶음을 database cluster라고 부른다.
- OS level에서 database cluster는 directory다. Database는 database cluster의 subdirectory이며 directory명은 database의 object id다.
  - $PGDATA 환경변수로 지정된 path에 DBMS 운영에 필요한 다양한 파일들이 저장된다.
  - Database cluster는 $PGDATA/base directory다.
  - Object id가 12345인 database는 $PGDATA/base/12345 directory다.
- Database에서 생성되는 table, index와 같은 object는 database directory 안에 file로서 저장된다.
  - Object가 처음 생성되었을 때 file명은 object id와 같지만 이후 달라질 수 있다. File명은 pg_class system table에 refilenode 컬럼으로 저장된다.
    - e.g) Truncate 발생 시 새로 file을 받게 되며 file명이 object id와 달라지게 된다.
  - File 하나의 크기는 최대 1G이고, 사이즈가 최댓값을 넘어가면 동일 이름에 numbering을 하여 file을 분리해 저장한다.
    - e.g) 원래 file 이름이 12345였다면, 1G 사이즈를 넘어갔을 때 database subdirectory에는 12345, 12345.1 file이 생성된다.
  - 동일 이름의 파일에 '_fsm', '_vm' suffix가 붙는 파일들도 생성되는데 이들은 다른 chapter에서 설명될 예정.
- PostgreSQL에서의 tablespace는 DB cluster directory 외부의 directory다.
  - 물리적으로는 tablespace가 만들어진 database directory 안에 tablespace의 object id로 symbolic link가 생성되고 지정된 외부 directory를 가르키게 된다.
  - Table 생성 시 tablespace를 지정하여 생성할 경우 table의 file이 외부 directory에 저장된다.
- Table file은 block 단위로 append가 되고, block의 default size는 8KB다.
  - Block은 header(24 bytes), line pointer array, tuples로 구성되어 있다.
  - Header에는 block에 대한 metadata와 freespace에 대한 정보가 적혀있다.
  - Line pointer는 tuple의 위치와 길이 정보를 가지고 있는 4 byte 짜리 구조체이고, header 이후로 array 형태로 append 된다.
  - Tuple은 실제 data가 담겨있고 block의 뒤에서부터 append 된다.
- Table을 sequential scan으로 읽을 때는 table file에 있는 block을 차례로 읽으며 line pointers로 dereferencing을 하며 tuple을 읽는다.
- Table을 index scan으로 읽을 때는 index tuple에 달려있는 tuple id(TID)를 보고 block과 tuple index를 받아 마찬가지로 line pointer를 통해 tuple을 읽는다.

## 1.1. 논리적 Level에서의 Data Layout :nerd_face:

<img 
  src="postgresql-data-layout.png"
  alt="PostgreSQL Data Layout"
  style="display:block; margin: 0 auto; width: 1024px"
/>

Top-down approach로 가보겠습니다. 최상위 level에서는 database cluster가 있습니다. Database cluster는 database community에서 흔히 말하는 여러 개의 database instance를 연결하여 하나의 system처럼 동작하게 하는 clustering 기법이 아니라, 단순히 database의 묶음을 통칭하며 하나의 PostgreSQL server가 hosting하고 관리하는 대상입니다. 

그 다음 level에는 database가 있습니다. Database는 table, index, sequence, view, function과 같이 database object들의 묶음을 뜻합니다. Database object에 대한 meta 정보(예를 들어 이름, 식별자, 객체 type 등등)는 자체 생성되는 table에 저장되는데, 그런 table을 system catalogs라고 부릅니다. System catalogs는 database-specific 합니다. 즉, 서로 다른 database는 각자의 system catalogs를 들고 있으며 role이나 몇 개의 object type을 제외하고는 집합론적인 관점에서 서로 배타적 관계라고 볼 수 있습니다. 예를 들어 서로 다른 database에 속해있는 table은 join되거나 하나의 query에서 동시에 조회될 수 없습니다(물론, FDW를 사용한다면 가능합니다만...이 부분은 4장에서 소개드리겠습니다). 

Database 아래에는 schema가 있습니다. 다른 RDBMS에서와 같이 PostgreSQL에서도 schema는 database 내 object들을 논리적으로 묶는 일종의 namespace 역할을 합니다. 비슷한 유형의 data를 묶거나 또는 권한 layer를 설정하는데 사용되고는 합니다(예를 들어 column-level user restriction을 주고 싶다면 특정 column들만 조회하는 view를 생성하여 하나의 schema로 묶어 user permission을 주면 됩니다). Schema는 일종의 namespace 역할을 하기 때문에 같은 database에 있더라도 서로 다른 schema에는 같은 이름의 object를 생성할 수 있습니다.

## 1.2. OS Level에서의 Data Layout :floppy_disk:
다시 한번 database cluster에서부터 시작하겠습니다. Database cluster는 하나의 directory로 mapping되며 그 directory를 base directory라고 부릅니다. PostgreSQL이 제공하는 initdb utility를 사용하여 database cluter를 생성할 때 DATADIR라는 변수명으로 directory path를 인자로 주는데, 해당 directory가 base directory가 됩니다. 주로 base directory는 PGDATA 환경변수에 저장됩니다.
```console
root@postgres11:/# initdb --help
initdb initializes a PostgreSQL database cluster.

Usage:
  initdb [OPTION]... [DATADIR]

Options:
  -A, --auth=METHOD         default authentication method for local connections
      --auth-host=METHOD    default authentication method for local TCP/IP connections
      --auth-local=METHOD   default authentication method for local-socket connections
 [-D, --pgdata=]DATADIR     location for this database cluster
...
root@postgres11:/# echo $PGDATA
/var/lib/postgresql/data
```
Base directory에는 다양한 file과 subdirectory가 생성됩니다. 아래는 base directory에 생성되는 file과 subdirectory에 대한 설명입니다.
|Files|설명|
|:---|:---|
|PG_VERSION|PostgreSQL의 major version number가 들어있는 file|
|pg_hba.conf|Client 인증정보를 제어하는 file|
|pg_ident.conf|OS user와 PostgreSQL user의 mapping 정보를 제어하는 file|
|postgresql.conf|PostgreSQL 설정 parameter를 저장하는 file|
|postgresql.auto.conf|ALTER SYSTEM 문으로 설정되는 parameter를 저장하는 file|
|postmaster.opts|PostgreSQL server가 기동된 command line을 기록하는 file|

|Subdirectory|설명|
|:---|:---|
|base/|Database subdirectory가 들어있는 subdirectory|
|global/|pg_database나 pg_control 같은 cluster-wide table이 들어있는 subdirectory|
|pg_commit_ts/|Transaction commit timestamp data가 들어있는 subdirectory|
|pg_dynshmem/|Dynamic shared memory subsystem이 사용한 file을 저정하는 subdirectory|
|pg_logical|TODO|
|pg_multixact|TODO|
|pg_notify|TODO|
|pg_repslot|TODO|
|pg_serial|TODO|
|pg_snapshots|TODO|
|pg_stat|TODO|
|pg_stat_tmp|TODO|
|pg_subtrans|TODO|
|pg_tblspc|TODO|
|pg_twophase|TODO|
|pg_wal|TODO|
|pg_xact|TODO|
|pg_xlog|TODO|

Database는 자신의 object id를 이름으로 갖는 subdirectory로 mapping 되며 $PGDATA/base subdirectory 안에 위치하게 됩니다. Table과 index는 속해있는 database의 subdirectory에 file로 저장되며 마찬가지로 처음에는 object id를 이름으로 갖게 됩니다. 하지만 table truncate나 reindex가 발생하는 경우 file 이름이 처음에 발급된 이름과 다른 것으로 생성되게 됩니다. 

```sql
postgres=# create table tibero (c1 char);
CREATE TABLE
postgres=# select relname, oid, relfilenode from pg_class where relname = 'tibero';
 relname |  oid  | relfilenode 
---------+-------+-------------
 tibero  | 24576 |       24576
(1 row)
```
```console
root@postgres11:/var/lib/postgresql# ll $PGDATA/base/13067/24576
-rw------- 1 postgres postgres 0 May 23 04:55 /var/lib/postgresql/data/base/13067/24576
```
```sql
postgres=# truncate table tibero;
TRUNCATE TABLE
postgres=# select relname, oid, relfilenode from pg_class where relname = 'tibero';
 relname |  oid  | relfilenode 
---------+-------+-------------
 tibero  | 24576 |       24579
(1 row)
```
```console
root@postgres11:/var/lib/postgresql# ll $PGDATA/base/13067/24576
-rw------- 1 postgres postgres 0 May 23 04:56 /var/lib/postgresql/data/base/13067/24576
root@postgres11:/var/lib/postgresql# ll $PGDATA/base/13067/24579
-rw------- 1 postgres postgres 0 May 23 04:56 /var/lib/postgresql/data/base/13067/24579
시간이 조금 흐른뒤
root@postgres11:/var/lib/postgresql# ll $PGDATA/base/13067/24576
ls: cannot access '/var/lib/postgresql/data/base/13067/24576': No such file or directory
```
Truncate가 발생한 직후에 기존 파일이 바로 지워지지는 않는 것을 확인할 수 있습니다. 반면 PostgreSQL 공식 문서에서는 바로 OS에 disk 공간을 반납한다고 적혀 있습니다.
<pre>
<a href="https://www.postgresql.org/docs/current/sql-truncate.html">PostgreSQL documents 참조</a>
Furthermore, it reclaims disk space immediately, rather than requiring a subsequent VACUUM operation. 
</pre>
그런 점으로 보아 내부 background process에서 해당 file의 descriptor를 열어놓고 있다가 어떤 작업을 진행한 후 delete를 해서 그런 것이 아닌가 생각이 듭니다. 이 부분에 대해서는 추가적으로 조사가 필요해 보이는군요.

마지막으로 PostgreSQL의 tablespace에 대해서 소개드리겠습니다. Tablespace는 CREATE TABLESPACE 문을 통해 생성되며 base directory 외부에 있는 target directory에 table이나 index를 저장할 때 사용됩니다. Tablespace는 base directory의 pg_tblspc subdirectory에 symbolic link로 저장됩니다. Tablespace를 생성하면 pg_tblspc subdirectory에 object id를 이름으로 DDL문에서 지정한 target directory를 가리키는 symbolic link가 저장이 됩니다. 

Tablespace의 target directory로 들어가보면 PostgreSQL version-specific한 이름으로 subdirectory가 생성된 것을 볼 수 있습니다. 해당 subdirectory의 naming 규칙은 아래와 같습니다.
```console
PG_'Major version'_'Catalogue version number'
```
이제 생성된 tablespace에 table을 생성하게 되면 일단 해당 table이 속해있는 database의 object id로 tablespace subdirectory 안에 subdirectory가 생성이 되고, 생성한 table의 table file이 그 안에 생성됩니다.
```sql
sampledb=# CREATE TABLE newtbl (.....) TABLESPACE new_tblspc;

sampledb=# SELECT pg_relation_filepath('newtbl');
             pg_relation_filepath             
---------------------------------------------
 pg_tblspc/16386/PG_14_202011044/16384/18894
```

## 1.3. Table File의 내부 구조 :page_with_curl:
TODO :rainbow:
## 1.4. Table File 읽기/쓰기 :memo:
TODO :rainbow: