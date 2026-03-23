# Unit Test Coverage for AetherMint Education API

This document outlines the comprehensive unit test suite implemented for the AetherMint Education backend API endpoints.

## Test Structure

### Configuration
- **Jest Configuration**: `jest.config.js`
  - Node.js test environment
  - 80% coverage threshold for branches, functions, lines, and statements
  - Coverage reports in text, LCOV, and HTML formats
  - TypeScript and JavaScript support

### Test Setup
- **Setup File**: `tests/setup.js`
  - In-memory MongoDB server for testing
  - Mock external dependencies (Stellar, IPFS, Redis)
  - Global test utilities and helpers
  - Database cleanup between tests

### Test Data Fixtures
- **Fixtures File**: `tests/fixtures/userData.js`
  - Mock user data (valid, invalid, admin)
  - Mock course data (valid, invalid, advanced)
  - Mock credential data (valid, expired, invalid)
  - Mock authentication data
  - Mock version control data
  - Helper functions for generating test data

## Test Coverage

### Authentication Middleware Tests
**File**: `tests/middleware/auth.test.js`

#### Coverage Areas:
- JWT token verification
- Permission validation by role
- Rate limiting functionality
- Authentication middleware (required and optional)
- Content access validation
- File size validation

#### Test Scenarios:
- Valid and invalid token handling
- Role-based permissions (admin, instructor, student, guest)
- Rate limit enforcement
- Missing/invalid authorization headers
- Permission insufficient scenarios

### Profile API Tests
**File**: `tests/routes/profiles.test.js`

#### Endpoints Tested:
- `GET /api/users/profile/:address` - Get user profile
- `PUT /api/users/profile/:address` - Update user profile
- `GET /api/users/settings/:userId` - Get user settings
- `PUT /api/users/settings/:userId` - Update user settings
- `GET /api/users/profile/:address/achievements` - Get user achievements
- `GET /api/users/profile/:address/stats` - Get user statistics

#### Test Scenarios:
- Successful CRUD operations
- Input validation (email format, username length, bio length)
- Error handling (404, 500)
- Partial updates
- Edge cases (malformed JSON, special characters, concurrent operations)

### Course API Tests
**File**: `tests/routes/courses.test.js`

#### Version Control Endpoints:
- `POST /api/courses/:contentId/versions` - Create version
- `GET /api/courses/:contentId/versions` - Get version history
- `GET /api/courses/:contentId/versions/current` - Get current version
- `GET /api/courses/:contentId/versions/:versionNumber` - Get specific version
- `POST /api/courses/versions/compare/:version1Id/:version2Id` - Compare versions
- `POST /api/courses/:contentId/versions/restore` - Restore version
- `PUT /api/courses/:contentId/versions/settings` - Update settings
- `GET /api/courses/:contentId/versions/export` - Export versions
- `GET /api/courses/:contentId/versions/statistics` - Get statistics

#### Course Management Endpoints:
- `POST /api/courses` - Create course
- `GET /api/courses` - List courses (with pagination and filters)
- `GET /api/courses/:courseId` - Get course
- `PUT /api/courses/:courseId` - Update course
- `DELETE /api/courses/:courseId` - Delete course
- `POST /api/courses/:courseId/enroll` - Enroll student
- `DELETE /api/courses/:courseId/enroll/:studentId` - Unenroll student
- `GET /api/courses/:courseId/progress/:studentId` - Get progress
- `PUT /api/courses/:courseId/progress/:studentId` - Update progress

#### Test Scenarios:
- Version creation and management
- Pagination and filtering
- Permission-based access control
- Data validation
- Error handling and edge cases
- Concurrent operations
- Rate limiting

### Credential API Tests
**File**: `tests/routes/credentials.test.js`

#### Endpoints Tested:
- `POST /api/credentials` - Create credential
- `GET /api/credentials/:credentialId` - Get credential
- `GET /api/credentials/recipient/:recipientAddress` - Get credentials by recipient
- `GET /api/credentials/issuer/:issuerAddress` - Get credentials by issuer
- `POST /api/credentials/:credentialId/verify` - Verify credential
- `POST /api/credentials/:credentialId/revoke` - Revoke credential
- `PUT /api/credentials/:credentialId` - Update credential
- `GET /api/credentials/search` - Search credentials
- `GET /api/credentials/stats` - Get statistics

#### Test Scenarios:
- Credential creation with IPFS integration
- Stellar signature verification
- Credential verification (valid, expired, revoked)
- Permission-based operations
- Search and filtering
- Statistics and analytics
- Error handling and edge cases
- Network timeouts and rate limiting

## Mocked Dependencies

### External Services
- **@stellar/stellar-sdk**: Mocked for transaction and signature operations
- **ipfs-http-client**: Mocked for IPFS upload/download operations
- **redis**: Mocked for rate limiting and caching
- **mongodb-memory-server**: In-memory MongoDB for testing

### Internal Services
- **userService**: Mocked for user-related operations
- **credentialService**: Mocked for credential management
- **courseController**: Mocked for course operations
- **stellarService**: Mocked for Stellar blockchain operations
- **ipfsService**: Mocked for IPFS operations

## Running Tests

### Available Scripts
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci

# Run tests with verbose output
npm run test:verbose

# Debug tests
npm run test:debug
```

### Coverage Reports
Coverage reports are generated in the `coverage/` directory:
- `lcov.info` - LCOV format for CI/CD integration
- `coverage/lcov-report/index.html` - HTML report for viewing
- Terminal output with coverage summary

## Coverage Thresholds

The test suite is configured with the following minimum coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm run test:ci
  
- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Coverage Badges
Add coverage badges to README.md:
```markdown
![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)
```

## Best Practices Implemented

### Test Organization
- Clear test structure with describe/it blocks
- Comprehensive test data fixtures
- Proper setup and teardown
- Mock isolation

### Error Handling
- All success and error scenarios tested
- Edge cases covered
- Network failures simulated
- Invalid input validation

### Performance Testing
- Rate limiting verification
- Concurrent operation testing
- Large data handling
- Timeout scenarios

### Security Testing
- Authentication and authorization
- Input validation
- Permission-based access control
- Signature verification

## Future Enhancements

### Additional Test Coverage
- Integration tests with real services
- End-to-end testing
- Performance benchmarking
- Load testing

### Test Automation
- Automated test execution on PR
- Coverage regression detection
- Test performance monitoring
- Automated test data generation

## Troubleshooting

### Common Issues
1. **Memory Server Issues**: Ensure MongoDB is not running on default port
2. **Mock Failures**: Check mock implementations in setup.js
3. **Coverage Threshold**: Adjust thresholds in jest.config.js if needed
4. **Permission Errors**: Ensure test environment variables are set

### Debug Tips
- Use `npm run test:debug` for step-by-step debugging
- Check coverage reports for untested code
- Review mock call logs in test output
- Verify test data fixtures are accurate

This comprehensive test suite ensures robust testing of all API endpoints with proper mocking, edge case coverage, and integration capabilities for CI/CD pipelines.
