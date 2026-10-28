# Báo cáo kiểm thử — MLN131

Ngày chạy: **28/10/2026**, múi giờ Asia/Bangkok. Trạng thái cuối: **`npm run verify` hoàn tất với exit code 0**. Không có test skip; Playwright retries = 0.

## Môi trường thực tế

| Thành phần                  | Phiên bản                                                        |
| --------------------------- | ---------------------------------------------------------------- |
| OS                          | Ubuntu 26.04 LTS / WSL2, kernel 6.6.87.2-microsoft-standard-WSL2 |
| Node.js / npm               | 22.23.4 / 11.16.0                                                |
| TypeScript / Vite           | 5.9.3 / 7.3.7                                                    |
| Vitest / coverage-v8        | 4.1.12 / 4.1.12                                                  |
| jsdom / Testing Library DOM | 27.4.0 / 10.4.2                                                  |
| Playwright                  | 1.64.1                                                           |
| Browser                     | Chromium headless shell 156.0.8078.4, revision 1248              |
| Zod                         | 4.6.7                                                            |

Linux ban đầu không có Node. Runtime đã tải vào `/tmp/mln-runtime/node-v22.23.4-linux-x64`. npm 10.9.9 gặp lỗi giải peer dependency; chuyển npm 11.16.0 và cài thành công theo package-lock.json.

Chromium đã tải bằng `npx playwright install chromium`, nhưng thiếu libnspr4/libnss3/libasound. Không có sudo không mật khẩu. Đã tải các gói Ubuntu bằng `apt-get download`, giải nén với `dpkg-deb -x` vào `/tmp/mln-browser-libs`, không cài vào hệ thống. Mirror updates trả 404 cho libnss3 nên dùng bản base `2:3.120-1ubuntu2`. Sau khi bổ sung LD_LIBRARY_PATH, Chromium khởi chạy và toàn bộ E2E chạy thật.

Lệnh verify cuối chạy trong shell:

```bash
export PATH=/tmp/mln-runtime/node-v22.23.4-linux-x64/bin:$PATH
export LD_LIBRARY_PATH=/tmp/mln-browser-libs/usr/lib/x86_64-linux-gnu
npm run verify
```

Trên máy thông thường có Node và system libraries: `npm ci`, `npx playwright install --with-deps chromium`, rồi `npm run verify`. Không cần các đường dẫn `/tmp` trên máy khác.

## Kết quả lệnh đã chạy

| Lệnh                                                     | Kết quả cuối                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `npm run typecheck`                                      | Pass, TypeScript strict                                         |
| `npm run lint`                                           | Pass, không lỗi ESLint                                          |
| `npm run validate:bank`                                  | Pass, 125 câu, 25 mỗi tầng                                      |
| `npm run test:coverage`                                  | **70/70 pass** trong 6 file: **48 unit + 22 integration**       |
| `npm run build`                                          | Pass, artifact public `dist/`                                   |
| `npm run test:e2e`                                       | Pass, build riêng `dist-e2e/`, **18/18 E2E**                    |
| `npm run verify`                                         | Pass toàn chuỗi bắt buộc, exit 0                                |
| `npm audit --json`                                       | 0 vulnerability sau khi nâng Vitest/coverage-v8 lên 4.1.12      |
| `npm run preview -- --port 4173 --strictPort` + HTTP GET | Public build được phục vụ; `http://127.0.0.1:4173/` trả **200** |

Unit và integration được chạy chung qua `test:coverage`, với engine/UI/storage thật; không mock phép tính thưởng. Hai script `test:unit` và `test:integration` lọc đúng thư mục. Các số coverage trên lấy từ lần chạy chung. Sau đó đã chạy riêng `npm run test:integration`: 22/22 pass trong 2 file (56,99 giây gồm khởi tạo jsdom trên WSL; tổng thời gian test 3,05 giây). `test:unit` chưa chạy riêng trong phiên này.

Thời gian lần verify cuối: Vitest 30,57 giây (bao gồm startup jsdom trên filesystem WSL); Playwright 22,9 giây. Browser dùng hai worker, clock điều khiển trước khi mở trang, không sleep chờ hết câu thật.

## Coverage cuối

Coverage v8 chạy mọi file `src/**/*.ts`, kể cả entrypoint chưa được import ở một số test. Không exclude engine hoặc dùng coverage ignore. JSON, CSS và WAV không phải mã TypeScript thực thi cần đo.

| Nhóm                         | Statements |   Branches |  Functions |      Lines |
| ---------------------------- | ---------: | ---------: | ---------: | ---------: |
| Domain                       |   **100%** | **99,45%** |   **100%** |   **100%** |
| Application / persistence    |       100% |       100% |       100% |       100% |
| UI                           |     99,64% |     97,14% |       100% |       100% |
| Overall, gồm main và fixture | **99,20%** | **98,53%** | **98,16%** | **99,47%** |

Ngưỡng tự động: domain ≥95% ở cả bốn chỉ số; overall ≥85% ở cả bốn. Đều đạt. Nhánh phòng vệ chống ghi lại ledger trong `settle` chưa được thực thi trực tiếp; các command lặp đã bị từ chối sớm hơn, và snapshot có ledger vòng chưa kết thúc bị chặn. Không đánh dấu ignore nhánh này. Import fixture theo compile mode được kiểm tra bởi E2E, không cộng E2E vào coverage Vitest.

Chi tiết: [báo cáo HTML](coverage/index.html), [JSON tổng hợp](coverage/coverage-summary.json), [Playwright HTML](playwright-report/index.html).

## Phạm vi nghiệp vụ đã chạy

- 14 vector chuẩn với expected độc lập, ma trận đúng/sai/timeout × bốn loại ô × bonus × mạng; ngưỡng tiền và timer; terminal priority, cap và idempotency.
- Bàn tại mọi vị trí đầu trên 1.000 seed cố định (25.000 bàn); count/bounds/an toàn đầu; fixture lân cận độc lập; không wrap, không flood, cắm/gỡ cờ không reserve câu. Đây là kiểm tra cấu trúc, không phải chứng minh phân phối thống kê đồng đều.
- Ngân hàng thật đủ 125 câu, schema lỗi, selector 25 câu khác nhau mỗi tầng, exposure ít nhất/cũ nhất, 24 hoán vị phương án và chấm theo stable ID.
- Submit tại deadline−1/deadline/deadline+1; timeout callback trễ/lặp; pause/resume; command cũ, submit kép, ô đã mở và chốt sai phase.
- UI thực: chọn/thay radio chưa chấm, HUD/feedback/snapshot cùng tiền, cap delta +5.000đ, bonus nối tiếp, quà mạng/cứu mạng/thua, lưu lỗi giữ candidate và retry không cộng lại, tên markup chỉ là text.
- Restore active giữ câu/order/selection/deadline, quá hạn timeout một lần; paused giữ remaining, feedback/finished không chấm lại; snapshot hỏng/khác bank có luồng tải bản sao và xác nhận. Phục hồi giữ ledger đọc được.
- 26 vòng ngắn kiểm tra exposure qua reload và bắt đầu vòng mới; câu tầng 1 chỉ lặp sau khi đã dùng hết 25 câu; ledger và tổng thưởng được giữ.
- E01–E18 chạy trên build tối ưu qua HTTP: cả 15 safe đúng chạm 150.000đ; mọi mìn đúng và một safe sai kết thúc ALL_SAFE_OPENED tại **136.008đ**; cashout hủy/xác nhận; khóa bàn và settlement một lần.
- Public `dist` được test riêng, không có fixture chunk hoặc hook window/query. E2E không ghi đè dist public.
- Desktop 1280×720 và mobile 390×844: HUD không bị panel che, radio/submit bằng bàn phím, selected/focus nhìn rõ; không lỗi page và không request ngoài origin trong luồng kiểm tra. Đã xem ảnh chụp thật ở cả hai viewport.

Bản UI mới: sidebar và bàn lớn theo ảnh tham chiếu, ô an toàn có gem SVG cục bộ. Câu hỏi/feedback hiển thị trong dialog ở giữa, có backdrop tối và blur. HUD ở phía trên lớp backdrop. E18 và integration mới kiểm tra focus trap, nền inert, không bỏ câu bằng Escape/click nền, giữ scroll khi chọn đáp án và trả focus về bàn sau feedback.

Ảnh: [bàn chơi](test-results/game-E18-centered-modal-di-ba573-cus-and-cannot-be-dismissed/board.png), [desktop](test-results/game-E15-desktop-mobile-HU-12d95--requests-or-console-errors/desktop.png), [mobile](test-results/game-E15-desktop-mobile-HU-12d95--requests-or-console-errors/mobile.png).

## Lỗi đã xử lý và giới hạn

Các lần chạy đầu phát hiện lỗi type trong helper test, JSON import attribute của Playwright và Chromium thiếu shared libraries; đều được sửa trước lần verify cuối. Một lần chạy coverage bị ENOENT vì hai tiến trình coverage trùng thư mục tạm; lần verify cuối chạy tuần tự và thành công. Không tăng timeout, thêm retries hoặc skip để vượt lỗi.

Build vẫn có cảnh báo annotation `@__PURE__` từ Zod: Rollup bỏ comment không hiểu vị trí, build thành công. Không lọc bỏ cảnh báo này. Có cảnh báo môi trường NO_COLOR/FORCE_COLOR từ Playwright; không phải lỗi game.

Chưa chạy Firefox, Safari, thiết bị vật lý hoặc lớp học thực tế; E2E chỉ dùng Chromium. Rà soát học thuật được ghi riêng tại [BANK_REVIEW.md](BANK_REVIEW.md): đã đối chiếu sơ bộ với PDF, giữ nguyên ngân hàng; chưa có phản biện giảng viên hay hiệu chuẩn độ khó bằng dữ liệu người chơi. Tự động validate schema không chứng minh đáp án học thuật.

Các số liệu trên là kết quả kiểm tra local. Workflow GitHub chạy cùng `npm run verify` rồi triển khai `dist/` lên GitHub Pages khi push `main`; trạng thái CI/deployment thực tế xem tại https://github.com/phamanhquan12/MLN131/actions. Chỉ hỗ trợ một máy/một tab do người dẫn kiểm soát; không tuyên bố chống DevTools, giao dịch nhiều tab hay chuyển tiền ngân hàng.

## Bổ sung kiểm tra CI

Lần CI đầu phát hiện test 26 vòng vượt timeout mặc định 5 giây (5,298 giây) do lặp truy vấn accessible name trên toàn cây DOM. Đã thay các truy vấn lặp trong riêng vòng stress test bằng selector cục bộ theo option ID và form/button hiện tại. Vẫn gửi DOM events qua UI thật, giữ engine/storage thật và các assertion về 25 câu trước khi lặp, đáp án theo stable ID, nút submit hợp lệ, tiền chốt và ledger 26 vòng. Các luồng khác tiếp tục kiểm tra accessible name. Không tăng timeout, retry hoặc skip. Typecheck, lint và 22 integration test đã pass sau thay đổi; trạng thái verify/deploy trên GitHub xem Actions.
