# @apical-ts/craft

## 0.7.2

### Patch Changes

- 183b1fa: Mod generated zod imports to save some space when bundling

## 0.7.1

### Patch Changes

- 9bbcdcc: Fix wrong URLs concatenation

## 0.7.0

### Minor Changes

- def0286: Add command line flags to control additional properties handling in
  schema generation

## 0.6.0

### Minor Changes

- 36cfb82: BREAKING: Moved shema definitions for parameters in their own modules

## 0.5.1

### Patch Changes

- 7a5d15f: Fix oneOf typings

## 0.4.0

### Minor Changes

- 777b004: Improve path parameters and headers serialization in client generator

## 0.3.1

### Patch Changes

- 6609bf0: Fix generated server barrel file

## 0.3.0

### Minor Changes

- bfd5240: Advanced handling of query parameters

## 0.2.0

### Minor Changes

- 44649a0: BREAKING: Add support for range status code in OpenAPI specs (ie.
  4XX, 5XX)

## 0.1.1

### Patch Changes

- Add support for OpenAPI consts and mixed enums

## 0.1.0

### Minor Changes

- First stable minor release

## 0.0.44

### Patch Changes

- d9117a4: Refactor command line flags

## 0.0.43

### Patch Changes

- Fix missing response schema

## 0.0.42

### Patch Changes

- Fix collisions in schema names

## 0.0.41

### Patch Changes

- Fix reference to response components

## 0.0.40

### Patch Changes

- Fix reference to components responses

## 0.0.39

### Patch Changes

- Fix for reserved keywords

## 0.0.38

### Patch Changes

- Fix unsafe access in getResponseContentType

## 0.0.37

### Patch Changes

- Split imports in generated client operations in order to work with
  verbatimModuleSyntax

## 0.0.36

### Patch Changes

- Fix default response handling

## 0.0.35

### Patch Changes

- Fix mismatch between response / requests bodies

## 0.0.34

### Patch Changes

- Add support for requestBodies section

## 0.0.33

### Patch Changes

- Add support for response references

## 0.0.32

### Patch Changes

- Add support for circular references

## 0.0.31

### Patch Changes

- Added build task to generated package

## 0.0.30

### Patch Changes

- Refactor return type of client operations to handle multiple content types

## 0.0.29

### Patch Changes

- Fix typings for configureOperations

## 0.0.28

### Patch Changes

- Enable Zod validation by default

## 0.0.27

### Patch Changes

- Remove generated unreachable code

## 0.0.26

### Patch Changes

- Remove prettier formatting for performance reason
- Added support for default response

## 0.0.25

### Patch Changes

- Changed Node engine constraints

## 0.0.24

### Patch Changes

- Fix handling of forma data

## 0.0.23

### Patch Changes

- Point readme to documentation website

## 0.0.22

### Patch Changes

- Reorganized examples folder, now in its own package

## 0.0.21

### Patch Changes

- Renamed proprty of ApiResponse

## 0.0.20

### Patch Changes

- Added changesets
