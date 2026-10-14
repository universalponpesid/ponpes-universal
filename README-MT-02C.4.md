# Universal Mart — MT-02C.4 Cart Checkout Cleanup

Patch incremental untuk baseline referensi `universal-mart-mt02c3-v4.4-fixed.zip`.

**Tidak termasuk full source dan tidak menyertakan `.env.local` atau kredensial.** Terapkan ke source existing setelah membuat backup/commit. Jika source lokal memiliki perubahan berbeda, cek konflik terlebih dahulu; jangan menimpa seluruh project.

## Isi
- `MT-02C.4-cart-checkout-cleanup.patch` — perubahan dua file saja.
- `MT-02C.4-CHANGELOG.md` — ringkasan perubahan dan batasan validasi.

## Cara menerapkan
Dari root repository:

```bash
patch --dry-run -p1 < MT-02C.4-cart-checkout-cleanup.patch
patch -p1 < MT-02C.4-cart-checkout-cleanup.patch
npm run typecheck
npm run build
```

Alternatif jika menggunakan Git:

```bash
git apply --check MT-02C.4-cart-checkout-cleanup.patch
git apply MT-02C.4-cart-checkout-cleanup.patch
```

Jika `--check` gagal, hentikan dan jangan memaksa apply. Bandingkan file checkout/cart yang ada dengan baseline patch.
