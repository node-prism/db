A lightweight, in-memory document database for smaller projects.
You can think of this as MongoDB's little brother.

# Installation

```bash
npm i @prism/db
```

# API overview

For a more thorough API reference, please look at the tests in this repository.

## Creating a collection

A collection is just a `.json` file.

```typescript
import { Collection } from "@prism/db";

type Planet = {
  planet: string;
  diameter: number;
  population?: number;
  temp: {
    avg: number;
  };
};

// from `./.data` load or create `planets.json`
const collection = new Collection<Planet>(".data", "planets");
```

## Inserting

```typescript
collection.insert({ planet: "Mercury", diameter: 4880, temp: { avg: 475 } });
collection.insert([
  { planet: "Venus", diameter: 12_104, temp: { avg: 737_000 } },
  { planet: "Earth", diameter: 12_742, temp: { avg: 288 } },
]);
```

## Finding

```typescript
// finds Earth document
collection.find({ avg: 288 });
collection.find({ planet: "Earth" });

// finds Venus and Earth documents
collection.find({ diameter: { $gt: 12_000 } });

// finds Mercury and Earth documents
collection.find({ temp: { avg: { $lt: 1_000 } } });

// finds Mercury and Earth documents
collection.find({ $and: [{ avg: { $gt: 100 } }, { avg: { $lt: 10_000 } }] });
```

## Updating

Any queries that work with `.find` work with `.update`.

```typescript
// increase population, creating the property if it doesn't exist.
collection.update({ planet: "Earth" }, { $inc: { population: 1 } });
```

## Removing

Any queries that work with `.find` work with `.remove`.

```typescript
collection.remove({ planet: "Earth" });
```

## Query options

`find`, `update` and `remove` accept a `QueryOptions` object.

```typescript
{
  /**
   * -1 || 0: descending
   *  1: ascending
   */
  sort: { [property: string]: -1 | 0 | 1 };

  /**
   * 1: property included in result document
   * 0: property excluded from result document
   */
  project: { [property: string]: 1 | 0 };

  /**
   * Particularly useful when sorting, `skip` defines the number of documents
   * to ignore from the beginning of the result set.
   */
  skip: number;

  /** Determines the number of documents returned. */
  take: number;

  join: Array<{
    /** The collection to join on. */
    collection: Collection<any>;

    /** The property containing the foreign key(s). */
    from: string;

    /** The property on the joining collection that the foreign key should point to. */
    to: string;

    /** The name of the property to be created while will contain the joined documents. */
    as: string;

    /** QueryOptions that will be applied to the joined collection. */
    options?: QueryOptions;
  }>;
}
```

### Sorting

```typescript
// [
//   { name: "Deanna Troi", age: 28 },
//   { name: "Worf", age: 24 },
//   { name: "Xorf", age: 24 },
//   { name: "Zorf", age: 24 },
//   { name: "Jean-Luc Picard", age: 59 },
//   { name: "William Riker", age: 29 },
// ];

collection.find({ age: { $gt: 1 } }, { sort: { age: 1, name: -1 } });
//                                                  ?????? asc     ?????? desc

// [
//   { name: "Zorf", age: 24 },
//   { name: "Xorf", age: 24 },
//   { name: "Worf", age: 24 },
//   { name: "Deanna Troi", age: 28 },
//   { name: "William Riker", age: 29 },
//   { name: "Jean-Luc Picard", age: 59 },
// ];
```

### Skip-take (i.e. LIMIT)

Mostly useful when paired with `sort`.

```typescript
// [
//   { a: 1, b: 1, c: 1 },
//   { a: 2, b: 2, c: 2 },
//   { a: 3, b: 3, c: 3 },
// ];

collection.find({ a: { $gt: 0 } }, { skip: 1, take: 1 });

// [
//   { a: 2, b: 2, c: 2 },
// ];
```

### Projection

The ID property of a document is always included unless explicitly excluded.

#### Implicit exclusion

When all projected properties have a value of `1`, this
is "implicit exclusion" mode.

In this mode, all document properties that are not defined
in the projection are excluded from the result document.

```typescript
// [
//   { a: 1, b: 1, c: 1 },
// ];

collection.find({ a: 1 }, { project: { b: 1 } });

// [
//   { _id: .., b: 1 },
// ];
```

#### Implicit inclusion

When all projected properties have a value of `0`, this
is "implicit inclusion" mode.

In this mode, all document properties that are not defined
in the projection are included from the result document.

```typescript
// [
//   { a: 1, b: 1, c: 1 },
// ];

collection.find({ a: 1 }, { project: { b: 0 } });

// [
//   { _id: .., a: 1, c: 1 },
// ];
```

#### Explicit

In the only remaining case, all document properties
are included unless explicitly removed with a `0`.

This is effectively the same behavior as implicit inclusion.

```typescript
// [
//   { a: 1, b: 1, c: 1 },
// ];

collection.find({ a: 1 }, { project: { b: 1, c: 0 } });

// [
//   { _id: .., a: 1, b: 1 },
// ];
```

### Joining

```typescript
// "users" collection

// [
//   { name: "Alice", purchased: [1, 2] },
// ];

// "tickets" collection

// [
//   { _id: 0, seat: "A1" },
//   { _id: 1, seat: "B1" },
//   { _id: 2, seat: "C1" },
//   { _id: 3, seat: "D1" },
// ];

users.find(
  { name: "Alice" },
  {
    join: [
      {
        collection: tickets,
        from: "purchased",
        to: "_id",
        as: "tickets",
        options: {
          project: { _id: 0 },
        },
      },
    ],
  }
);

// [
//   {
//     name: "Alice",
//     purchased: [1, 2],
//     tickets: [
//       { seat: "B1" },
//       { seat: "C1" },
//     ],
//   },
// ];
```

`join` allows for `QueryOptions` which in turn alows for `join`.
This means that joins can be chained for more complex relationships
between collections.

```typescript
users.find(
  { .. },
  {
    join: [{
      collection: tickets,
      options: {
        join: [{
          collection: seats,
          options: {
            join: [{
              collection: auditoriums,
            }]
          }
        }]
      }
    }]
  }
);
```

## Misc

### Renaming builtin property names

The default property names for document ID (default `_id`), "created at"
(default `_created_at`) and "updated at" (default `_updated_at`) timestamps can all be changed.

```typescript
import { ID_KEY, CREATED_AT_KEY, UPDATED_AT_KEY } from "@prism/db";

ID_KEY = "id";
CREATED_AT_KEY = "createdAt";
UPDATED_AT_KEY = "updatedAt";
```

If you do this, make sure to do it at the beginning of collection creation.

### Documents

The returned value from `find`, `update` and `remove` is always an array, even when there
are no results.
