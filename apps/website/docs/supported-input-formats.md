# Supported Input Formats

@apical-ts/craft provides comprehensive support for various OpenAPI
specification formats, automatically handling format conversion and
normalization to ensure compatibility.

## Supported Versions

The generator automatically detects and converts different OpenAPI specification
versions:

### OpenAPI 2.0 (Swagger)

- **File extensions**: `.json`, `.yaml`, `.yml`
- **Conversion**: Automatically converted to OpenAPI 3.0, then to 3.1
- **Support level**: ✅ Full support with automatic conversion

### OpenAPI 3.0.x

- **File extensions**: `.json`, `.yaml`, `.yml`
- **Conversion**: Automatically converted to OpenAPI 3.1
- **Support level**: ✅ Full support with automatic conversion

### OpenAPI 3.1.x

- **File extensions**: `.json`, `.yaml`, `.yml`
- **Conversion**: No conversion needed
- **Support level**: ✅ Native support

### Benefits of Normalization

1. **Consistent Processing** - All specifications are processed using the same
   logic
2. **Latest Features** - Takes advantage of OpenAPI 3.1.x enhancements
3. **JSON Schema Compatibility** - OpenAPI 3.1.x uses JSON Schema draft 2020-12
4. **Better Type Safety** - More precise type definitions and validations

## Reference Resolution

The generator automatically resolves external references:

### Local References

```yaml
# References to local files
$ref: './schemas/user.yaml#/User'
$ref: '../common/errors.yaml#/Error'
```

### Remote References

```yaml
# References to remote files
$ref: 'https://api.example.com/schemas/common.yaml#/Error'
$ref: 'https://raw.githubusercontent.com/user/schemas/main/user.yaml#/User'
```

### Internal References

```yaml
# References within the same document
$ref: '#/components/schemas/User'
$ref: '#/components/responses/NotFound'
```
