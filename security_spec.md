# Security Specification - Sweet Delights

## 1. Data Invariants
- A `User` profile can only be created by the authenticated user whose `uid` matches the document ID.
- `CustomRequest` and `Order` documents must specify a `userId` that matches the authenticated user's `uid`.
- Users can only read, update, or delete their own `CustomRequest` and `Order` documents.
- `User` profile data (PII like email) is private to the owner.

## 2. Dirty Dozen payloads

1. **Identity Spoofing**: User A tries to create a `CustomRequest` with `userId: "UserB"`.
2. **Profile Hijacking**: User A tries to update User B's profile document in `/users/UserB`.
3. **Ghost Field Injection**: User tries to add `isAdmin: true` to their user profile.
4. **Invalid Status**: User tries to set `status: "completed"` on an `Order` which should be system-controlled.
5. **PII Leak**: Non-authenticated user tries to `get` a user profile to see their email.
6. **Large Payload Attack**: User tries to send a 10MB string in `chefPitch`.
7. **Resource Poisoning**: User tries to use a 1000-character string as a document ID.
8. **Unverified Auth**: User with `email_verified: false` tries to make an order.
9. **Terminal State Break**: User tries to update a `CustomRequest` after it has been `confirmed`.
10. **Orphaned Write**: User tries to create an order without a valid user profile.
11. **Query Scraping**: Authenticated user tries to list ALL `orders` without a `where` filter for their `userId`.
12. **Timestamp Spoof**: User tries to set a `createdAt` date in the past.

## 3. Test Runner (Draft Plan)
- Test `list` queries block non-filtered requests.
- Test `create` and `update` fail without UID matching.
- Test terminal states are locked.
