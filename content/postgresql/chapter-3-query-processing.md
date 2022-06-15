3장에서는 client가 요청한 query를 PostgreSQL의 backend process가 어떻게 처리하는지에 대해 소개합니다. Query processing에 필요한 component들이 각각 어떤 역할을 수행하는지 처리 순서대로 소개하며, 특히 Planner와 Executor의 동작 방식에 대해 조금 더 자세히 살펴보겠습니다.

---
## 3.0. TL;DR 🤷 
3장 내용 요약!

## 3.1. Overview 🗺️
PostgreSQL은 parallel query를 제외한 모든 query를 backend process에서 처리합니다. Backend process는 아래 component로 나눠집니다.
- Parser: 평문으로 되어 있는 SQL statement의 syntax를 검증하고, 다음 단계에서 처리 가능한 형태의 자료구조인 parser tree를 생성하는 역할을 맡습니다.
- Analyzer: Parser tree를 통해 query의 semantic을 검증하고, 다음 단계에서 처리 가능한 형태의 자료구조인 query tree를 생성하는 역할을 맡습니다. 
- Rewriter: Query tree를 정해진 rule을 통해 변형하는 역할을 맡습니다. View를 조회하는 subtree를 inlining 한다던지 또는 불필요하거나 중복적인 expression을 제거하여 tree를 간소화 하는 일을 해당 단계에서 진행합니다.
- Planner: Query tree에서 요구하는 data 가공을 제일 효율적으로 수행할 수 있는 operation들의 조합을 찾아 plan tree로 생성하는 역할을 맡습니다.
- Executor: Plan tree의 각 plan node에 대응되는 operation을 수행하는 역할을 맡습니다.

### 3.1.1 Parser
Parser는 평문으로 되어 있는 SQL statement의 syntax check를 하고 parse tree를 생성하는 일을 맡고 있습니다. 여기서 syntax check란 SQL 문법에 알맞게 query가 작성되었는지를 검증하는 것을 뜻합니다. 예를 들어 SELECT, FROM, WHERE 절이 적절한 위치에 쓰여졌는지, 또는 projection 할 column list에 쉼표를 잘 넣었는지 등을 확인합니다. Column과 table의 이름이 알맞게 쓰여졌는지는 syntax check 단계에서 하지 않고 semantic check 단계에서 진행되며, 해당 책임은 analyzer module에 있습니다. 

Parser tree는 평문 SQL의 요소를 논리적으로 구분하여 저장한 자료구조입니다. 다만 하나의 구조체로 표현되는 것은 아니고 statement의 형태 마다 대응되는 구조체가 있으며, 그것들의 집합을 parser tree라고 부릅니다. 예를 들어 <a href="https://github.com/postgres/postgres/blob/master/src/include/nodes/parsenodes.h">parsenodes.h</a> 에 정의된 *Stmt 구조체들이 parser tree라는 카테고리를 구성하는 요소라고 할 수 있습니다.  

```c
typedef struct InsertStmt
{
  NodeTag    type;
  RangeVar   *relation;      /* relation to insert into */
  List       *cols;          /* optional: names of the target columns */
  Node       *selectStmt;    /* the source SELECT/VALUES, or NULL */
  OnConflictClause *onConflictClause; /* ON CONFLICT clause */
  List       *returningList; /* list of expressions to return */
  WithClause *withClause;    /* WITH clause */
  OverridingKind override;   /* OVERRIDING clause */
} InsertStmt;

typedef struct DeleteStmt
{
  NodeTag    type;
  RangeVar   *relation;      /* relation to delete from */
  List	     *usingClause;   /* optional using clause for more tables */
  Node	     *whereClause;   /* qualifications */
  List	     *returningList; /* list of expressions to return */
  WithClause *withClause;    /* WITH clause */
} DeleteStmt;

typedef struct UpdateStmt
{
  NodeTag    type;
  RangeVar   *relation;      /* relation to update */
  List	     *targetList;    /* the target list (of ResTarget) */
  Node	     *whereClause;   /* qualifications */
  List	     *fromClause;    /* optional from clause for more tables */
  List	     *returningList; /* list of expressions to return */
  WithClause *withClause;    /* WITH clause */
} UpdateStmt;

typedef struct MergeStmt
{
  NodeTag    type;
  RangeVar   *relation;         /* target relation to merge into */
  Node	     *sourceRelation;   /* source relation */
  Node	     *joinCondition;    /* join condition between source and target */
  List	     *mergeWhenClauses; /* list of MergeWhenClause(es) */
  WithClause *withClause;       /* WITH clause */
} MergeStmt;

typedef struct SelectStmt
{
  NodeTag    type;

  /*
    * These fields are used only in "leaf" SelectStmts.
    */
  List       *distinctClause; /* NULL, list of DISTINCT ON exprs, or
                                * lcons(NIL,NIL) for all (SELECT DISTINCT) */
  IntoClause *intoClause;     /* target for SELECT INTO */
  List       *targetList;     /* the target list (of ResTarget) */
  List       *fromClause;     /* the FROM clause */
  Node       *whereClause;    /* WHERE qualification */
  List       *groupClause;    /* GROUP BY clauses */
  bool        groupDistinct;  /* Is this GROUP BY DISTINCT? */
  Node       *havingClause;   /* HAVING conditional-expression */
  List       *windowClause;   /* WINDOW window_name AS (...), ... */

  /*
    * In a "leaf" node representing a VALUES list, the above fields are all
    * null, and instead this field is set.  Note that the elements of the
    * sublists are just expressions, without ResTarget decoration. Also note
    * that a list element can be DEFAULT (represented as a SetToDefault
    * node), regardless of the context of the VALUES list. It's up to parse
    * analysis to reject that where not valid.
    */
  List       *valuesLists;    /* untransformed list of expression lists */

  /*
    * These fields are used in both "leaf" SelectStmts and upper-level
    * SelectStmts.
  */
  List       *sortClause;     /* sort clause (a list of SortBy's) */
  Node       *limitOffset;    /* # of result tuples to skip */
  Node       *limitCount;     /* # of result tuples to return */
  LimitOption limitOption;    /* limit type */
  List       *lockingClause;  /* FOR UPDATE (list of LockingClause's) */
  WithClause *withClause;     /* WITH clause */

  /*
    * These fields are used only in upper-level SelectStmts.
    */
  SetOperation op;          /* type of set op */
  bool         all;         /* ALL specified? */
  struct SelectStmt *larg;  /* left child */
  struct SelectStmt *rarg;  /* right child */
  /* Eventually add fields for CORRESPONDING spec here */
} SelectStmt;
```
<br/>

간단한 예시를 통해 SelectStmt가 어떻게 구성되는지 확인해보겠습니다. 아래 예시와 같은 SQL이 주어졌다고 가정해봅시다.
```sql
testdb=# SELECT id, data FROM tbl_a WHERE id < 300 ORDER BY data;
```
이때 SelectStmt는 아래와 같이 생성됩니다.
<figure>
  <img
    src="https://www.interdb.jp/pg/img/fig-3-02.png"
    alt="Parse tree example"
    style="display: inline-block; margin: 0 auto; width: 1024px"
  />
  <figcaption style="text-align: center">Fig 3.1 - Parser tree example</figcaption>
</figure>

Select list에 있는 id, data column들이 targetList에 담기게 됩니다. fromClause에는 tbl_a table이 담기고, whereClause에는 id < 300 조건문이 expression tree로 담기게 됩니다. 마지막으로 query의 ORDER BY 문이 sortClause에 담기는 것을 확인할 수 있습니다.

### 3.1.2 Analyzer
Parser가 SQL statement의 syntax check를 했다면 analyzer는 semantic check를 담당합니다. Semantic check란 SQL statement에 포함된 table, functions, 또는 연산자들을 system catalogs를 이용해 유효성 여부를 검사하는 것을 뜻합니다. Parser 단계에서는 system catalog lookup이 발생하지 않지만 analyzer 단계에서는 유효성 검사를 위한 lookup이 발생하게 됩니다.

Semantic check를 진행하면서 만들어지는 결과물은 query tree라는 자료구조로 만들어집니다. Query tree의 root에는 Query라는 구조체가 위치해 있으며 해당 구조체에는 parser tree의 각 요소들에 대한 metadata를 저장할 수 있도록 구성되어 있습니다. Query는 Stmt 구조체들과 같이 <a href="https://github.com/postgres/postgres/blob/master/src/include/nodes/parsenodes.h">parsenodes.h</a>에 위치해 있습니다.  

```c
/*
 * Query -
 *	  Parse analysis turns all statements into a Query tree
 *	  for further processing by the rewriter and planner.
 *
 *	  Utility statements (i.e. non-optimizable statements) have the
 *	  utilityStmt field set, and the rest of the Query is mostly dummy.
 *
 *	  Planning converts a Query tree into a Plan tree headed by a PlannedStmt
 *	  node --- the Query structure is not used by the executor.
 */
typedef struct Query
{
	NodeTag		type;

	CmdType		commandType;	/* select|insert|update|delete|merge|utility */

	QuerySource querySource;	/* where did I come from? */

	uint64		queryId;		/* query identifier (can be set by plugins) */

	bool		canSetTag;		/* do I set the command result tag? */

	Node	   *utilityStmt;	/* non-null if commandType == CMD_UTILITY */

	int			resultRelation; /* rtable index of target relation for
								 * INSERT/UPDATE/DELETE/MERGE; 0 for SELECT */

	bool		hasAggs;		/* has aggregates in tlist or havingQual */
	bool		hasWindowFuncs; /* has window functions in tlist */
	bool		hasTargetSRFs;	/* has set-returning functions in tlist */
	bool		hasSubLinks;	/* has subquery SubLink */
	bool		hasDistinctOn;	/* distinctClause is from DISTINCT ON */
	bool		hasRecursive;	/* WITH RECURSIVE was specified */
	bool		hasModifyingCTE;	/* has INSERT/UPDATE/DELETE in WITH */
	bool		hasForUpdate;	/* FOR [KEY] UPDATE/SHARE was specified */
	bool		hasRowSecurity; /* rewriter has applied some RLS policy */

	bool		isReturn;		/* is a RETURN statement */

	List	   *cteList;		/* WITH list (of CommonTableExpr's) */

	List	   *rtable;			/* list of range table entries */
	FromExpr   *jointree;		/* table join tree (FROM and WHERE clauses);
								 * also USING clause for MERGE */

	List	   *mergeActionList;	/* list of actions for MERGE (only) */
	bool		mergeUseOuterJoin;	/* whether to use outer join */

	List	   *targetList;		/* target list (of TargetEntry) */

	OverridingKind override;	/* OVERRIDING clause */

	OnConflictExpr *onConflict; /* ON CONFLICT DO [NOTHING | UPDATE] */

	List	   *returningList;	/* return-values list (of TargetEntry) */

	List	   *groupClause;	/* a list of SortGroupClause's */
	bool		groupDistinct;	/* is the group by clause distinct? */

	List	   *groupingSets;	/* a list of GroupingSet's if present */

	Node	   *havingQual;		/* qualifications applied to groups */

	List	   *windowClause;	/* a list of WindowClause's */

	List	   *distinctClause; /* a list of SortGroupClause's */

	List	   *sortClause;		/* a list of SortGroupClause's */

	Node	   *limitOffset;	/* # of result tuples to skip (int8 expr) */
	Node	   *limitCount;		/* # of result tuples to return (int8 expr) */
	LimitOption limitOption;	/* limit type */

	List	   *rowMarks;		/* a list of RowMarkClause's */

	Node	   *setOperations;	/* set-operation tree if this is top level of
								 * a UNION/INTERSECT/EXCEPT query */

	List	   *constraintDeps; /* a list of pg_constraint OIDs that the query
								 * depends on to be semantically valid */

	List	   *withCheckOptions;	/* a list of WithCheckOption's (added
									 * during rewrite) */

	/*
	 * The following two fields identify the portion of the source text string
	 * containing this query.  They are typically only populated in top-level
	 * Queries, not in sub-queries.  When not set, they might both be zero, or
	 * both be -1 meaning "unknown".
	 */
	int			stmt_location;	/* start location, or -1 if unknown */
	int			stmt_len;		/* length in bytes; 0 means "rest of string" */
} Query;
```
<br/>

Fig 3.1의 parser tree는 아래와 같은 query tree로 생성이 됩니다.
<figure>
  <img
    src="https://www.interdb.jp/pg/img/fig-3-03.png"
    alt="Query tree example"
    style="display: inline-block; margin: 0 auto; width: 1024px"
  />
  <figcaption style="text-align: center">Fig 3.2 - Query tree example</figcaption>
</figure>

## 3.2. Cost-based Optimization 🪙

## 3.3. Plan Tree Generation 🌲

## 3.4. Executor and Operation Algorithms ⚙️
