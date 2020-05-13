import { test, assert } from '../../src/index';

export default test("a test")
  .step("some step", async () => {
    return { foo: "foo" }
  })
  .step("this does nothing", async() => {

  })
  .step("another step", async ({ foo }) => {
    return { bar: foo.toUpperCase() + "bar" }
  })
  .assertion("this is an assertion", ({ foo }) => {
    assert.equal(foo, "foo");
  })
  .assertion("this is another assertion", ({ bar }) => {
    assert.equal(bar, "foobar");
  })
  .child("a child test", (test) => (
    test
      .step("a child step", async ({ foo }) => {
        return { quox: foo.toUpperCase() + "blah" }
      })
      .assertion("a child assertion", ({ quox }) => {
        assert.equal(quox, "FOOblah");
      })
  ))
