# Feature Specification: GitHub Tarball Deployment

**Feature Branch**: `004-github-tarball-deploy`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "the application is ready to deploy - i want to make a github action that tests and packs the application and versions it and publishes the tarball so i can reference it with npm install from a url - in the root there should be a file that indicates a link to the tarball that is the latest so i can update from that url to point to the correct asset - i dont want to publish on npm etc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Release on Push (Priority: P1)

When code is pushed to the main branch, the system automatically validates, versions, and packages the application into a tarball that can be installed directly via npm without using the npm registry.

**Why this priority**: This is the core value - enabling zero-dependency deployment and distribution without relying on npm registry infrastructure. It provides immediate value by automating the entire release workflow.

**Independent Test**: Can be fully tested by pushing a commit to the main branch and verifying that a GitHub release is created with a downloadable tarball that successfully installs via `npm install <tarball-url>`.

**Acceptance Scenarios**:

1. **Given** code is pushed to the main branch, **When** all tests pass, **Then** a new versioned release is created with an attached tarball
2. **Given** code is pushed to the main branch, **When** any test fails, **Then** no release is created and the workflow fails with a clear error message
3. **Given** a release is created, **When** viewing the release on GitHub, **Then** the tarball asset is downloadable and named according to the version

---

### User Story 2 - Latest Release Reference File (Priority: P2)

Users can quickly find the installation URL for the latest release by reading a file in the repository root that always points to the current latest tarball.

**Why this priority**: Provides convenience for automated installation scripts and documentation. While not strictly required (users could manually find releases), it significantly improves the user experience for installation.

**Independent Test**: Can be tested by reading the reference file and verifying that the URL it contains points to the most recent release's tarball asset.

**Acceptance Scenarios**:

1. **Given** a new release is published, **When** the reference file is read, **Then** it contains the URL to the latest release's tarball
2. **Given** the reference file URL, **When** running `npm install <url>`, **Then** the package installs successfully
3. **Given** multiple releases exist, **When** checking the reference file, **Then** it always points to the most recent release, not older versions

---

### User Story 3 - Semantic Version Management (Priority: P1)

The system automatically determines appropriate version numbers based on commit history or version bumping strategy, ensuring each release has a unique and meaningful version identifier.

**Why this priority**: Version management is critical for dependency tracking and ensuring users can install specific versions or upgrade predictably. Without proper versioning, the entire distribution system breaks down.

**Independent Test**: Can be tested by making several releases and verifying that version numbers increment correctly and follow semantic versioning conventions.

**Acceptance Scenarios**:

1. **Given** a new release is triggered, **When** the workflow runs, **Then** a new version number is assigned that is higher than the previous release
2. **Given** version information in package.json, **When** creating a release, **Then** the Git tag and release name match the package version
3. **Given** no manual version changes, **When** multiple releases occur, **Then** each has a unique, incrementing version number

---

### User Story 4 - Pre-Release Quality Gates (Priority: P1)

Before any release is published, the system runs all tests and build processes to ensure the tarball contains working, validated code.

**Why this priority**: Quality gates are essential to prevent broken releases from being distributed. This is a fundamental requirement for any automated deployment system.

**Independent Test**: Can be tested by intentionally breaking tests and verifying that no release is created, then fixing tests and verifying a release is created.

**Acceptance Scenarios**:

1. **Given** test failures exist, **When** attempting to create a release, **Then** the workflow stops and no release artifacts are created
2. **Given** tests pass but the build fails, **When** attempting to create a release, **Then** the workflow stops with a build error
3. **Given** all quality checks pass, **When** creating a release, **Then** the packaged tarball is published to GitHub releases
4. **Given** linting errors exist, **When** attempting to create a release, **Then** the workflow reports the linting issues and stops

---

### Edge Cases

- What happens when the version number already exists as a Git tag or release?
- How does the system handle concurrent pushes to the main branch that might trigger overlapping release workflows?
- What happens if the GitHub release creation succeeds but uploading the tarball asset fails?
- How is the reference file updated if it is locked or has merge conflicts?
- What happens when the repository lacks proper npm package structure (missing package.json)?
- How does the system behave if authentication/permissions for creating releases are insufficient?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST run all tests (unit, integration, type-checking, linting) before creating any release
- **FR-002**: System MUST build and package the application into a tarball format compatible with `npm install <url>`
- **FR-003**: System MUST automatically determine or increment the version number for each release
- **FR-004**: System MUST create a Git tag matching the version number for each release
- **FR-005**: System MUST create a GitHub release with the version-tagged tarball as a downloadable asset
- **FR-006**: System MUST update a reference file in the repository root containing the URL to the latest release tarball
- **FR-007**: System MUST only trigger releases on pushes to the main branch (or specified release branch)
- **FR-008**: System MUST fail the entire workflow if any quality gate (test, build, lint) fails
- **FR-009**: System MUST ensure the tarball includes all necessary dependencies and files for the package to function when installed
- **FR-010**: System MUST prevent duplicate version numbers by checking existing tags before release
- **FR-011**: The reference file MUST be automatically updated to point to the new release URL after successful publication
- **FR-012**: System MUST make the tarball publicly accessible via HTTPS URL for npm installation

### Key Entities

- **Release**: Represents a specific version of the application, including version number, Git tag, release notes, and associated tarball asset
- **Tarball Asset**: The packaged application file (.tgz format) attached to a GitHub release, containing all files needed for npm installation
- **Reference File**: A text file in the repository root (e.g., `LATEST_RELEASE_URL.txt` or similar) containing the HTTPS URL to the most recent tarball
- **Version Identifier**: A semantic version number (e.g., 1.2.3) that uniquely identifies each release and corresponds to the Git tag

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can install the package from any release tarball URL using standard `npm install <url>` command without errors
- **SC-002**: Every push to the main branch that passes all quality checks results in a new release being created within 5 minutes
- **SC-003**: The reference file is updated within 1 minute of a new release being published
- **SC-004**: Zero releases are created when any test or build step fails
- **SC-005**: 100% of releases have unique, incrementing version numbers with no duplicates
- **SC-006**: Users can determine the latest installation URL by reading a single file without navigating through GitHub releases UI
- **SC-007**: The published tarball contains all required files and installs successfully in a clean Node.js environment without additional manual steps

## Assumptions

1. The repository already has a valid `package.json` file with standard npm package structure
2. GitHub Actions is available and enabled for the repository
3. The repository has appropriate permissions configured for GitHub Actions to create releases and push commits
4. The main branch (or designated release branch) is protected and requires PR approval for direct commits
5. Semantic versioning will be used (MAJOR.MINOR.PATCH format)
6. The version number source of truth is `package.json` and will be automatically incremented
7. Test scripts are already defined in `package.json` (e.g., `npm test`, `npm run lint`, `npm run build`)
8. The tarball should include production dependencies but exclude development dependencies
9. The reference file will be committed back to the repository after each release
10. Standard npm pack behavior is acceptable for creating the tarball (no custom packaging logic needed)

## Constraints

- Must not require npm registry account or publishing permissions
- Must not require manual version number updates for each release
- Must work within GitHub's free tier limitations for Actions and releases
- Must not interfere with development workflows on non-main branches
- The reference file must be in a standard format (plain text or simple JSON) readable by scripts and humans

## Dependencies

- Existing test infrastructure in the project
- GitHub repository with Actions enabled
- GitHub Personal Access Token or GITHUB_TOKEN with release creation permissions
- Node.js and npm available in the GitHub Actions runner environment

## Out of Scope

- Publishing to npm registry or other package registries
- Manual release approval or gating (all releases are automatic on main branch push)
- Release notes generation or changelog automation (may be added in future iterations)
- Multi-platform or multi-architecture builds (single Node.js tarball only)
- Rollback mechanisms or release deletion workflows
- Pre-release channels (alpha, beta, rc) - only stable releases
- Integration with external deployment platforms or notification services
