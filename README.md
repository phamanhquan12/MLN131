# MLN131 — Dò mìn tri thức

GitHub Pages: **https://phamanhquan12.github.io/MLN131/**

Mỗi lần push lên `main`, GitHub Actions chạy toàn bộ kiểm tra trước khi triển khai public build `dist/`. Pull request chỉ chạy kiểm tra. [Xem trạng thái triển khai](https://github.com/phamanhquan12/MLN131/actions).

Game tiếng Việt cho một người chơi mỗi vòng, trên một máy được chiếu trước lớp. Giao diện bàn lớn với sidebar điều khiển; chọn ô sẽ mở câu hỏi ở giữa màn hình trên nền tối, làm mờ. HUD thưởng luôn hiện phía trên modal. Ngân hàng có sẵn 125 câu về Chương 6, Phần I — dân tộc. Không cần tài khoản, backend hoặc API để chơi.

## Chạy ứng dụng

Cần Node.js **22.12 trở lên** (đã kiểm tra trên Node 22) và npm. Dùng terminal tại thư mục dự án:

```bash
npm ci
npm run dev
```

Mở địa chỉ Vite in ra, thường là `http://localhost:5173`. Chỉ dùng **một tab** cho một buổi. Nhập tên tùy chọn rồi bắt đầu. Dữ liệu lưu trong localStorage của trình duyệt, theo origin; đổi máy, trình duyệt hoặc cổng sẽ không tự mang dữ liệu sang.

## Cách chơi

- Bàn 5×5: 10 mìn, 10 an toàn thường, 2 quà mạng, 3 quà bonus. Ô đầu luôn an toàn thường; không tự mở vùng số 0.
- Bắt đầu 10.000đ, 1 mạng; tối đa 3 mạng. Đúng ô an toàn cộng 8.000đ. Sai an toàn giữ `floor(tiền × 88 / 100)`, không mất mạng.
- Đúng mìn còn nửa tiền, giữ mạng. Sai mìn mất một mạng và còn nửa tiền nếu có mạng dự phòng; còn 1 mạng thì thua, thưởng về 0đ.
- Quà chỉ nhận khi đúng. Bonus tăng **phần cộng** của lượt ngay tiếp theo lên 16.000đ nếu đó là an toàn đúng; hết hiệu lực sau lượt đó dù gặp mìn hoặc trả lời sai. Bonus mới được cấp sau khi tính thưởng hiện tại.
- Chọn radio rồi bấm **Xác nhận** (hoặc Enter). Radio chưa phải nộp bài. Hết giờ tính sai. Người dẫn có thể tạm dừng và tiếp tục; đóng tab/reload không cấp lại thời gian.
- Có thể chốt thưởng giữa các lượt sau câu đầu, với xác nhận đúng số tiền. Không chốt khi đang hỏi, tạm dừng hoặc xem feedback. Vòng tự kết thúc khi hết mạng, chạm trần 150.000đ hoặc mở đủ 15 ô an toàn.
- Chuột phải hoặc bật chế độ cắm cờ để đánh dấu. Gỡ cờ trước khi mở. Có nút âm thanh, mặc định tắt.

HUD luôn dùng tiền hiện tại; dự báo ở panel câu hỏi là số riêng. Thưởng đã chốt và tổng buổi được ghi ở lịch sử, không phải xác nhận chuyển khoản. Game không thu tiền tham gia. Trần áp dụng mỗi vòng.

## Lưu và phục hồi

Một snapshot versioned chứa vòng, bàn, câu/order/lựa chọn, deadline, exposure và ledger tại key `mln131.session.v1`. Mỗi thay đổi được ghi trước khi cập nhật giao diện. Nếu ghi lỗi, game khóa và giữ candidate trong bộ nhớ; **Thử lưu lại** ghi đúng candidate đó, không tính lại thưởng.

Snapshot hỏng hoặc khác phiên bản sẽ chặn chơi, cho tải JSON gốc và yêu cầu xác nhận phục hồi. Phục hồi giữ những kết quả đã chốt đọc được và được validate độc lập; không tự đoán thưởng của vòng dở. Khi bank đổi, lịch sử câu cũ được bỏ theo xác nhận phục hồi. Nút **Xóa dữ liệu buổi** riêng sẽ xóa toàn bộ sau xác nhận. Vòng mới thông thường giữ exposure và ledger.

Đây là ứng dụng static do người dẫn kiểm soát. localStorage không chống chỉnh sửa DevTools và không cung cấp giao dịch nhiều tab hoặc tính toàn vẹn thanh toán.

## Kiểm thử

```bash
npx playwright install --with-deps chromium
npm run typecheck
npm run lint
npm run validate:bank
npm run test:unit
npm run test:integration
npm run test:coverage
npm run build
npm run test:e2e
# Hoặc tất cả theo đúng thứ tự:
npm run verify
```

Unit và integration ở thư mục riêng; coverage chạy cả hai một lần, gồm mọi file TypeScript trong `src`, kể cả file chưa import. Ngưỡng domain: 95% cho statements/branches/functions/lines; overall: 85% cả bốn chỉ số. Các vector tiền expected, bảng ngưỡng và 24 hoán vị được khai báo độc lập trong test.

Playwright chạy Chromium 1280×720 và kiểm tra tương tác ở 390px; dùng browser clock, không chờ 20–30 giây thật. Có 18 luồng E01–E18. `test:e2e` build fixture riêng vào **dist-e2e**, dùng cổng 4174; E17 dùng public **dist** trên 4173. Hai cổng phải trống. Lệnh này cần có build public từ `npm run build` trước. `verify` thực hiện đầy đủ. Không host `dist-e2e`. Fixture chỉ được import khi compile mode `e2e`; public không có hook query/window để điều khiển luật.

Kết quả thật, coverage và hạn chế: [TEST_REPORT.md](TEST_REPORT.md). Rà soát nội dung nguồn: [BANK_REVIEW.md](BANK_REVIEW.md). Báo cáo HTML coverage ở `coverage/index.html`, E2E ở `playwright-report/index.html`; trace chỉ giữ khi lỗi. CI dùng lockfile, chạy verify và upload artifact kiểm thử.

## Build và host static

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

`dist/` là artifact public để đưa lên static hosting hỗ trợ HTTPS. `vite preview` chỉ để kiểm tra build local. Có thể kiểm tra bằng HTTP static đơn giản:

```bash
python3 -m http.server 8080 --directory dist
```

Mặc định `base: './'`, có thể đặt toàn bộ nội dung `dist` tại root hoặc thư mục con, truy cập URL thư mục có dấu `/` cuối. Nếu hosting yêu cầu base cố định:

```bash
npm run build -- --base=/mln131/
```

Không có client-side routing; refresh tại URL thư mục chứa index.html giữ vòng qua localStorage nếu origin giữ nguyên. Static host cần phục vụ index.html của thư mục đó. Không mở bằng `file://`. GitHub Pages phục vụ game tại `/MLN131/`; `base: './'` tương thích subpath này.

## Cấu trúc

- `src/domain`: engine thuần, quy tắc tiền, RNG có seed, bàn và chọn câu; nhận command/thời gian, trả state; không đọc DOM, storage hoặc clock toàn cục.
- `src/application`: dispatcher ghi trước commit, schema và kiểm tra invariants snapshot bằng Zod.
- `src/ui`: DOM an toàn với textContent, CSS responsive và âm thanh WAV cục bộ.
- `src/data/questions.json`: metadata và 125 câu trích nguyên từ phụ lục.
- `src/testing`: adapter bàn tham chiếu chỉ dùng test build.
- `tests`, `e2e`, `scripts`: kiểm thử và validator ngân hàng.

Tài liệu cấu hình đã tham khảo: [Vite build/base](https://vite.dev/guide/build), [Vitest coverage](https://vitest.dev/guide/coverage), [Playwright clock](https://playwright.dev/docs/clock).
