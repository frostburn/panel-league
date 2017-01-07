/* eslint-env browser */
/* global define */

// Public domain code for 31-bit KISS generator.
// Depends on JS bitwise operators producing signed 32 bit integers.

((global, factory) => {
  const JKISS31 = factory();

  if (typeof module === 'object' && module != null && module.exports) {
    module.exports = JKISS31;
  } else if (typeof define === 'function' && define.amd) {
    define(() => JKISS31);
  } else {
    global.JKISS31 = JKISS31;
  }
})(typeof window !== 'undefined' ? window : this, () => {
  const INT32_MASK_FULL = 4294967295;
  const INT32_MASK_POSITIVE = 2147483647;

  function JKISS31() {
    this.x = 123456789;
    this.y = 234567891;
    this.z = 345678912;
    this.w = 456789123;
    this.c = 0;
  }

  JKISS31.MAX_VALUE = INT32_MASK_POSITIVE;

  JKISS31.unserialize = function(packet) {
    const params = JSON.parse(packet);
    const j = new JKISS31();
    j.x = params.x;
    j.y = params.y;
    j.z = params.z;
    j.w = params.w;
    j.c = params.c;
    return j;
  }

  JKISS31.prototype.serialize = function() {
    return JSON.stringify(this);
  }

  JKISS31.prototype.scramble = function() {
    this.x = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL;
    this.y = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL;
    this.z = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL;
    this.w = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL;
    this.c = (Math.random() < 0.5) & 1;
  }

  JKISS31.prototype.step = function() {
    this.y ^= (this.y << 5);
    this.y ^= (this.y >> 7);
    this.y ^= (this.y << 22);
    const t = (this.z + this.w + this.c) & INT32_MASK_FULL;
    this.z = this.w;
    this.c = (t < 0) & 1;
    this.w = t & 2147483647;
    this.x = (this.x + 1411392427) & INT32_MASK_FULL;

    return (this.x + this.y + this.w) & INT32_MASK_POSITIVE;
  }

  return JKISS31;
});
