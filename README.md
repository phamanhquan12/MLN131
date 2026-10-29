# VNR202 — Dò mìn tri thức

Game học tập tiếng Việt về cách mạng hai miền **1954–1965**, dành cho một người chơi mỗi vòng trên một máy chiếu. Giữ giao diện sidebar, ô gem và câu hỏi trong modal có nền tối/blur; HUD tiền luôn nhìn rõ.

GitHub Pages: **https://phamanhquan12.github.io/MLN131/**. Tên đường dẫn repository được giữ để người dùng cũ nhận bản cập nhật; nội dung và runtime chỉ còn VNR202. [Trạng thái kiểm tra và triển khai](https://github.com/phamanhquan12/MLN131/actions).

## Chạy và kiểm tra

Cần Node.js **22.12 trở lên** và npm; các phiên bản cụ thể được khóa trong package-lock.json.

```bash
npm ci
npm run dev
```

Mở URL Vite in ra, thường `http://localhost:5173`. Chỉ dùng một tab cho mỗi buổi. Không có backend, tài khoản, đồng bộ nhiều máy hoặc API sinh câu hỏi. Các tài nguyên chơi game đều bundled/cục bộ.

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
# Toàn bộ kiểm tra bắt buộc và build:
npm run verify
```

`test:coverage` chạy unit và integration một lần; bao gồm mọi file TypeScript production trong src. Domain cần ≥95% statements/branches/functions/lines, overall ≥85% ở cả bốn chỉ số. Không mock phép chấm hay phép tính tiền. Các vector expected được khai báo độc lập trong test.

Playwright dùng browser clock trước khi mở trang, Chromium 1280×720 và 390px. Public `dist` được phục vụ trên 4173; fixture build tối ưu riêng ở `dist-e2e` trên 4174. Hai cổng phải trống. `test:e2e` cần public build trước; `verify` thực hiện đầy đủ. Không host `dist-e2e`. Bản public không có fixture qua query hoặc window global.

`npm run build` tạo build sạch và chạy `audit:build`: phát hiện ID/prompt ngân hàng cũ trong bundle, đồng thời kiểm đủ 125 ID VNR. Tài liệu MLN gốc vẫn được giữ làm nguồn lưu trữ/audit, không được import vào game hay đưa vào dist. Không có service worker hoặc CacheStorage app cần nâng/xóa; Vite phát hành asset có tên hash mới.

## Luật VNR202

| Nội dung                | Giá trị                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ |
| Bàn                     | 5×5: 7 mìn, 13 thường, 2 quà mạng, 3 quà bonus                                 |
| An toàn                 | 18 ô, bao gồm quà; ô đầu luôn thường                                           |
| Khởi điểm               | 25.000đ, một mạng, tối đa ba mạng                                              |
| Đúng an toàn/quà        | +12.000đ; nếu có bonus cũ: +24.000đ                                            |
| Sai/hết giờ an toàn/quà | floor(C × 88 / 100), không mất mạng/quà không nhận                             |
| Đúng mìn                | floor(C / 2), giữ mạng                                                         |
| Sai/hết giờ mìn         | Có mạng dự phòng: trừ một mạng và còn nửa tiền; còn một mạng: tiền 0, hết mạng |
| Trần                    | 150.000đ mỗi vòng                                                              |

Bonus chỉ nhân đôi **phần cộng** ở lượt ngay tiếp theo nếu an toàn đúng; không nhân tổng tiền, không cộng dồn. Bonus cũ được tiêu thụ dù lượt sau là mìn/sai/hết giờ; đúng quà bonus mới cấp lại sau khi tính tiền. Quà mạng chỉ nhận khi đúng.

Hệ số = tiền hiện có / **25.000**: bắt đầu x1,00; safe đúng đầu 37.000đ/x1,48; safe sai đầu 22.000đ/x0,88; trần x6,00. HUD hiển thị tiền thực, dự báo riêng; delta khi cap chỉ là số tăng thực tế.

| Tầng | Tiền trước lượt  | Giây |
| ---- | ---------------- | ---: |
| 1    | 0–39.999đ        |   25 |
| 2    | 40.000–64.999đ   |   25 |
| 3    | 65.000–94.999đ   |   30 |
| 4    | 95.000–124.999đ  |   30 |
| 5    | 125.000–149.999đ |   30 |

Tầng/timer đóng băng theo cash nguyên trước lượt, có thể giảm sau penalty. Không dùng hệ số đã làm tròn để chọn tầng. Chọn radio chưa nộp; bấm Xác nhận/Enter để nộp. Hết giờ tính sai ngay cả khi đã chọn radio. Người dẫn có thể pause; reload giữ deadline hoặc pause, không cấp thêm thời gian.

Không tự mở vùng 0. Cắm/gỡ cờ bằng chuột phải hoặc nút chế độ; cờ không reserve câu. Chốt thưởng giữa lượt sau ít nhất một câu đã xử lý, cần xác nhận đúng số tiền. Auto end khi hết mạng, chạm cap hoặc mở đủ 18 an toàn (kể cả sai). Ưu tiên BUSTED > CAP_REACHED > ALL_SAFE_OPENED. Không cần mở hết bàn để chốt/chạm cap. Settlement ghi một lần, vẫn xem feedback trước khi kết thúc.

Âm thanh mặc định tắt. Tên hiển thị tùy chọn được đưa vào textContent. Không thu tiền tham gia, không có thanh toán; lịch sử là thưởng người tổ chức đã chốt. localStorage không chống sửa DevTools hoặc cung cấp giao dịch nhiều tab.

## Ngân hàng và lưu buổi

125 câu mới, 25 mỗi tầng, có familyId và format. Đây là 25 chủ đề neo được tổ chức thành năm hình thức nhận thức, không phải 125 chủ đề độc lập. Trong một vòng không lặp ID **hoặc family** dù đổi tầng. Mỗi tầng có 25 family nên không cần fallback. Giữa vòng ưu tiên exposure ít nhất, cũ nhất rồi RNG; vòng mới giữ lịch sử buổi VNR.

Metadata: courseId `VNR202`, bankVersion `vnr202-1954-1965-hard-125-v1`, schemaVersion **2**. Snapshot chính tại `vnr202.session.v2` chứa bàn, RNG, lịch sử, câu/order/lựa chọn, deadline/remaining và ledger. Candidate phải lưu thành công trước khi commit UI; lỗi ghi khóa game, retry ghi candidate hiện tại, không replay phép tính.

Khi thấy đúng key cũ `mln131.session.v1` mà chưa có snapshot VNR, app chặn bàn, thông báo cập nhật và yêu cầu xác nhận. Có thể tải raw backup trước. Sau xác nhận: ghi snapshot VNR sạch trước, xóa đúng key cũ rồi mới mở giao diện. Không giữ vòng/exposure/tiền hay trộn ledger MLN vào tổng VNR; không xóa dữ liệu app khác, không gọi localStorage.clear(). Nếu ghi/xóa lỗi thì khóa và cho retry. Reload ưu tiên snapshot VNR hợp lệ, hoàn tất cleanup còn dở mà không reset vòng VNR mới. Migration idempotent.

Snapshot hỏng/khác phiên bản không được chấm bằng nội dung khác. Luồng phục hồi yêu cầu xác nhận; chỉ giữ ledger VNR đúng schema đọc được. Nút xóa dữ liệu buổi riêng cần xác nhận; vòng mới bình thường không xóa exposure/ledger.

## Host và tài liệu

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# Hoặc kiểm tra static:
python3 -m http.server 8080 --directory dist
```

`vite preview` chỉ phục vụ kiểm tra local. Upload toàn bộ dist lên static hosting HTTPS; mặc định `base: './'` hỗ trợ root hoặc subpath với dấu `/` cuối. Có thể build base cố định bằng `npm run build -- --base=/MLN131/`. Không mở bằng file://. Không có client routing; refresh tại thư mục index giữ snapshot nếu origin giữ nguyên.

GitHub Actions chạy verify theo lockfile, chỉ deploy **dist public** sau khi pass trên main; PR chỉ kiểm tra. CI upload coverage/Playwright artifacts. Hướng dẫn và kết quả thật: [TEST_REPORT.md](TEST_REPORT.md). Rà nội dung với PDF: [BANK_REVIEW.md](BANK_REVIEW.md). Độ khó chưa được hiệu chuẩn bằng người chơi; schema test không chứng minh đáp án học thuật.
