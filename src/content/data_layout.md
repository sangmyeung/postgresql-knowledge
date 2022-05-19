# Chapter 1. Data Layout
홈 화면에서도 언급했지만 해당 요약은 Hironobu Suzuki의 블로그 "The Internals of PostgreSQL"를 기반으로 작성된 내용인 점을 다시 한번 말씀드립니다.

## TL;DR :shrug:
- PostgreSQL에서의 database는 database object들의 collection이며 하나의 PG server instance에서 여러 개의 database를 가질 수 있다. 이를 database cluster라고 부른다.
- 물리적으로 database cluster는 directory다. Database는 database cluster의 subdirectory이며 directory명은 database의 object id다.
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

## Database Cluster의 논리적 구조 :brain:
TODO :rainbow:
## Database Cluster의 물리적 구조 :floppy_disk:
TODO :rainbow:
## Table File의 내부 구조 :page_with_curl:
TODO :rainbow:
## Table File 읽기/쓰기 :memo:
TODO :rainbow: