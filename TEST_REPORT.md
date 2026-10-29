# Báo cáo kiểm thử — VNR202 migration

Ngày chạy local: **29/10/2026 (Asia/Bangkok)**. `npm run verify` hoàn tất **exit code 0**: typecheck → lint → validate bank → coverage → public build/audit → E2E. Không skip, không tăng timeout, Playwright retries = 0.

## Môi trường

Ubuntu 26.04 LTS / WSL2, Node **22.23.4**, npm **11.16.0**, TypeScript **5.9.3**, Vite **7.3.7**, Vitest/coverage-v8 **4.1.12**, jsdom **27.4.0**, Testing Library DOM **10.4.2**, Playwright **1.64.1**, Zod **4.6.7**. Chromium headless shell **156.0.8078.4** revision 1248.

Trong môi trường WSL này, Node và shared libraries Chromium được chuẩn bị từ phiên trước tại `/tmp/mln-runtime` và `/tmp/mln-browser-libs`. Lệnh thực tế:

```bash
export PATH=/tmp/mln-runtime/node-v22.23.4-linux-x64/bin:$PATH
export LD_LIBRARY_PATH=/tmp/mln-browser-libs/usr/lib/x86_64-linux-gnu
npm run verify
npm run test:unit
```

Máy khác dùng `npm ci`, `npx playwright install --with-deps chromium`, rồi `npm run verify`; không cần các đường dẫn tạm của máy này.

## Kết quả thực tế

| Lệnh                    | Kết quả                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`     | Pass với TypeScript strict                                                                                               |
| `npm run lint`          | Pass                                                                                                                     |
| `npm run validate:bank` | Pass: course VNR202, schema 2, đúng bankVersion, 125 câu, 25 câu/family riêng mỗi tầng                                   |
| `npm run test:coverage` | **80/80 pass**, 7 file: **52 unit + 28 integration**; 58,85 giây gồm startup jsdom trên WSL                              |
| `npm run test:unit`     | **52/52 pass**, 4 file; 35,01 giây gồm startup; chạy sau khi bổ sung mốc terminal priority trùng 18 safe và callback trễ |
| `npm run build`         | Pass, Vite làm sạch dist trước khi tạo public artifact                                                                   |
| `npm run audit:build`   | Pass: đủ 125 VNR IDs, không có ID/prompt của bank cũ trong public bundle                                                 |
| `npm run test:e2e`      | **19/19 pass**, Chromium trên public/test build qua HTTP, 28,4 giây                                                      |
| `npm run verify`        | Pass toàn chuỗi bắt buộc, exit 0                                                                                         |

Integration được chạy thật qua coverage cùng unit, không mock engine/chấm tiền. Script `test:integration` lọc riêng đúng thư mục; chưa chạy riêng script này cho bản VNR, không gán kết quả standalone của phiên MLN trước vào bản mới. Bank runtime bằng nguyên JSON phụ lục; metadata sourceDocument có tên alias như ghi trong BANK_REVIEW.

## Coverage

Bao gồm mọi `src/**/*.ts`, kể cả entrypoint và file chưa import. Không exclude engine hoặc ignore nhánh để vượt ngưỡng.

| Nhóm                               | Statements |   Branches |  Functions |      Lines |
| ---------------------------------- | ---------: | ---------: | ---------: | ---------: |
| Domain                             |   **100%** | **99,48%** |   **100%** |   **100%** |
| Application, snapshot và migration |       100% |       100% |       100% |       100% |
| UI                                 |     99,64% |     97,23% |       100% |       100% |
| Overall (gồm main và fixture)      | **99,09%** | **98,60%** | **97,34%** | **99,34%** |

Domain ≥95% và overall ≥85% ở cả bốn chỉ số, đều đạt. Nhánh phòng vệ settlement đã tồn tại trong ledger chưa được đi qua trực tiếp: state hợp lệ chặn các sự kiện lặp trước khi tới nhánh đó, và snapshot ledger không phù hợp bị từ chối. Main có nhánh compile-time E2E và adapter chưa đo đủ trong Vitest; E2E kiểm tra đường runtime thật, không cộng coverage E2E vào các tỷ lệ trên.

Chi tiết khi chạy local: [coverage HTML](coverage/index.html), [JSON summary](coverage/coverage-summary.json), [Playwright HTML](playwright-report/index.html). CI upload các artifact này.

## Nghiệp vụ và migration đã kiểm tra

- 14 vector tiền mới với expected hằng độc lập; ma trận bốn loại ô × đúng/sai/timeout × bonus × mạng; làm tròn xuống, cap delta +5.000đ và không nhân tổng tiền.
- Regression cấu hình: khởi điểm25.000, SAFE +12.000, bonus +24.000, mẫu số hệ số25.000, x1,00/x1,48/x0,88/x6,00, 7 mìn/13 thường/18 an toàn. Mở 15 safe chưa phải ALL_SAFE_OPENED.
- 25 vị trí đầu ×1.000 seed cố định: đủ7/13/2/3, đầu thường, bounds và tái lập. Fixture0 có0 mìn cạnh, ô15 có2, ô17 có4. Không wrap, không tính quà, không flood; cờ không reserve câu.
- Ngân hàng 125 VNR, 25 mỗi tầng; ID/family/format/schema/course/bankVersion và các dữ liệu lỗi. Không lặp family khi chọn25 câu cùng tầng hoặc trộn năm tầng. Không fallback. Snapshot có hai ID khác nhau cùng family bị từ chối.
- Exposure tăng khi reserve đúng một lần, vòng mới giữ history; 26 vòng ngắn dùng hết25 câu tầng1 trước khi lặp. Giữ stable option IDs qua24 hoán vị và reload.
- Ngưỡng 39.999/40.000,64.999/65.000,94.999/95.000,124.999/125.000; tầng/timer đóng băng trong lượt, chỉ đổi ở lượt sau khi tăng hoặc giảm tiền.
- Deadline−1/exact/+1, pause/resume, timeout/submit lặp và callback cũ; không chốt trong câu/paused/feedback. Reload giữ câu/order/selection/deadline; feedback/finished không chấm hoặc settlement lại.
- HUD, cashout, feedback, snapshot và ledger cùng tiền; tên markup chỉ là text; lỗi lưu giữ candidate và retry không tính lại.
- E07: safe0..7 đúng đạt37.000,49.000,73.000,97.000,121.000,133.000,145.000,150.000; lives3, mới mở8 safe, ô8 vẫn kín, settlement đúng một lần qua reload/continue.
- E08: safe0 sai →7 mìn18..24 đúng →17 safe còn lại sai. Oracle độc lập floor từng bước, kết thúc ALL_SAFE_OPENED với **16đ**, lives1, safeOpened18, ledger khớp. Không cần cap để kết thúc hợp lệ.
- Migration nhận diện đúng `mln131.session.v1`, chặn bàn/chấm dữ liệu cũ, thông báo cập nhật, có tải raw backup và xác nhận. Hủy không đổi dữ liệu. Sau xác nhận VNR khởi tạo sạch25.000/7 mìn, không trộn exposure/ledger MLN.
- Chỉ xóa key cũ của trò chơi; giữ `unrelated-app`. Không dùng localStorage.clear trong app. Migration write/cleanup lỗi khóa game; retry candidate; reload trong cleanup lỗi ưu tiên snapshot VNR đã ghi mà không reset/chấm lại. Migration lần hai giữ nguyên VNR active.
- Không có service worker/CacheStorage app để migrate. Build Vite làm sạch dist/dist-e2e; audit kiểm tra ID và toàn bộ prompt từ tài liệu gốc cũ không có trong public assets. Tài liệu người dùng gốc được bảo toàn, không thuộc runtime/deploy.
- Public production không nhận test-control qua query/window, fixture chỉ trong mode e2e. E18 giữ modal giữa màn hình, dim/blur, focus trap, Escape/click nền không bỏ câu, focus trả về bàn. E19 kiểm tra old-storage→confirm→VNR→reload giữ lượt.
- Desktop1280×720 và mobile390×844: HUD không bị che, radio/Enter submit/focus/selected rõ; không lỗi page hoặc request ngoài trong luồng kiểm tra. Đã xem ảnh chụp thật của bản VNR.

Ảnh local: [bàn VNR](test-results/game-E18-centered-modal-di-ba573-cus-and-cannot-be-dismissed/board.png), [modal desktop](test-results/game-E15-desktop-mobile-HU-12d95--requests-or-console-errors/desktop.png), [modal mobile](test-results/game-E15-desktop-mobile-HU-12d95--requests-or-console-errors/mobile.png).

## Giới hạn và lỗi đã xử lý

Lần lint đầu của bản migration phát hiện import test không dùng; đã sửa rồi chạy verify thành công. Khi lập oracle non-cap, đã tính trực tiếp độc lập và sửa expected thành16đ trước khi chạy suite; không dùng engine để tạo expected. Không tăng timeout, retry hoặc skip. Stress test26 vòng tiếp tục dùng selector cục bộ cho thao tác lặp, giữ UI/engine/storage thật và assertion nội dung phương án; các luồng khác vẫn dùng accessible-name queries.

Rollup còn cảnh báo comment annotation @**PURE** từ Zod; build vẫn thành công, không lọc cảnh báo. Playwright có cảnh báo môi trường NO_COLOR/FORCE_COLOR không liên quan luật game.

Chưa kiểm tra Firefox/Safari, thiết bị thật hoặc lớp học thực tế. Đã rà125 đáp án/mệnh đề theo PDF, ghi riêng [BANK_REVIEW.md](BANK_REVIEW.md), chưa có phản biện giảng viên hoặc hiệu chuẩn thực nghiệm độ khó. Schema/coverage không chứng minh nội dung học thuật.

Các số trên là kết quả local. [GitHub Actions](https://github.com/phamanhquan12/MLN131/actions) là nguồn trạng thái CI/deployment; workflow chỉ xuất bản dist sau khi verify pass. Giữ URL `/MLN131/` để cập nhật người dùng cũ, course runtime là VNR202. Trò chơi một máy/một tab, không tuyên bố chống sửa DevTools, giao dịch nhiều tab hoặc thanh toán ngân hàng.
