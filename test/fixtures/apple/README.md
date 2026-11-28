A **test-only** certificate chain shaped like the App Store's (a root, an intermediate with Apple's
WWDR marker extension 1.2.840.113635.100.6.2.1, a leaf with the App Store signing marker
1.2.840.113635.100.6.11.1), made with openssl for `test/applePurchases.test.js`. The server trusts
it only when a test calls `apple.setRoot(<its fingerprint>)`; in every other case it trusts Apple
Root CA - G3 alone. `leaf.key` signs the test transactions; it has no use outside the tests.
