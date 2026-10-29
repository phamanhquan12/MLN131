# PROMPT MIGRATE GAME SANG VNR202 — 125 CÂU NÂNG ĐỘ KHÓ

Bạn là agent triển khai. Hãy migrate ứng dụng dò mìn hiện có từ MLN131 sang VNR202 theo đặc tả này; nếu chưa có mã ứng dụng thì tạo mới theo cùng đặc tả. Giao ứng dụng chạy được, unit/integration/E2E và báo cáo kết quả thật, không dừng ở kế hoạch. Tệp này tự chứa ngân hàng125 câu; không cần lấy ngân hàng từ prompt cũ.

## 1. Quyết định thay đổi và thứ tự ưu tiên

| Hạng mục | Yêu cầu mới |
|---|---|
| Nội dung | VNR202, cách mạng hai miền1954–1965 |
| Ngân hàng | Thay hoàn toàn bằng125 câu VNR202, 25 câu mỗi tầng |
| Tiền ban đầu | 25.000đ |
| Trần mỗi vòng | Giữ150.000đ |
| Mìn | 7/25 ô |
| Ô thường | 13/25 ô |
| Quà | 2 mạng +3 bonus, thuộc18 ô an toàn |
| Thưởng ô an toàn đúng | +12.000đ, tăng50% so với +8.000đ trước đây |
| Thưởng có bonus cũ | +24.000đ, nhân đôi phần tăng thêm |
| Sai an toàn/quà | Giữ88% tiền, không cộng thưởng; quà bị mất |
| Đúng mìn | Giữ nửa tiền, không mất mạng |
| Sai mìn | Có mạng dự phòng: mất một mạng và nửa tiền; hết mạng: tiền0, thua |
| Hệ số | Tiền hiện có /25.000; khởi điểm x1,00, trần x6,00 |

“Tăng rate” trong bản này được cụ thể hóa thành tăng phần thưởng mỗi ô50%; không đổi sang lãi kép. Hệ số m là số tiền so với25.000đ ban đầu, không phải hệ số nhân tiền mỗi lần mở. Mọi số tiền, test và UI phải dùng cùng cấu hình mới. Khi mã hiện tại hoặc tài liệu cũ khác đặc tả này thì bản này có ưu tiên.

## 2. XÓA NGÂN HÀNG CŨ TRONG ỨNG DỤNG — BẮT BUỘC

- Xóa dữ liệu câu MLN131 khỏi source/runtime, JSON cũ, import, fallback, seed, generator và bundle deploy. Không nối125 câu mới vào125 câu cũ. Không giữ cơ chế chọn môn để quay về ngân hàng cũ.
- Đổi tiêu đề, nhãn môn, metadata, README và câu mẫu sang VNR202. Không chỉ đổi nhãn của câu cũ.
- Xóa ngân hàng cũ khỏi public assets, output build và cache app thuộc scope trò chơi; build sạch. Nếu có service worker, nâng cache version và bỏ đúng cache app cũ; không xóa cache/site khác cùng origin.
- Đổi courseId='VNR202', bankVersion='vnr202-1954-1965-hard-125-v1' và schemaVersion cho state mới. ID câu mới đều bắt đầu `vnr-`; familyId bắt đầu `vnr-family-`.
- Snapshot vòng đang chơi, tiền, exposure, option order và câu hỏi MLN131 không được phục hồi vào luật mới. Trước khi hiện bàn, phát hiện dữ liệu app cũ, thông báo đã cập nhật phiên bản và yêu cầu bắt đầu vòng VNR mới; không diễn giải ID cũ bằng nội dung mới.
- Migration được phép xóa đúng các key thuộc app cũ sau khi xác định namespace từ mã hiện có. Không gọi `localStorage.clear()`. Không xóa dữ liệu không thuộc trò chơi.
- Lịch sử tiền đã chốt cũ nếu giữ phải tách thành mục lưu trữ có courseId cũ, không trộn tổng buổi VNR; không giữ ngân hàng câu cũ để đọc lịch sử. Exposure và vòng VNR phải bắt đầu sạch.
- Migration idempotent: refresh sau lần migrate không xóa vòng VNR vừa bắt đầu. Nếu lưu migration lỗi thì báo lỗi, không hiện trạng thái nửa cũ nửa mới.
- Không yêu cầu xóa tài liệu gốc hoặc tệp trong ChatGPT Library. “Xóa bank cũ” ở đây là công việc với ứng dụng và tài nguyên deploy, không phải xóa toàn bộ tài liệu người dùng.
- Nếu chưa có mã nguồn cũ: ghi rõ không có dữ liệu/source để xóa; triển khai mới chỉ gồm VNR. Không bịa việc đã migrate một app chưa được cung cấp.

## 3. Kiến trúc, bàn cờ và luật chung

- Một người chơi một lượt, một máy được chiếu trước lớp; static web, không backend, không phòng nhiều người và không thu tiền tham gia.
- Giữ quy ước repository/AGENTS.md nếu có. Bắt đầu mới dùng TypeScript strict + Vite + DOM/CSS; Vitest và Playwright. Nếu repo đã dùng framework thì giữ framework nhưng tách engine thuần khỏi UI.
- Bàn5×5:7 mìn +13 SAFE +2 LIFE_GIFT +3 BONUS_GIFT. Các quà đều an toàn. Ban đầu một mạng, tối đa ba.
- Ô đầu luôn SAFE thường. Sau khi biết ô đầu, lấy mẫu24 vị trí còn lại thành7 mìn,12 SAFE,2 LIFE_GIFT,3 BONUS_GIFT. Sinh một lần rồi persist.
- Fisher–Yates/RNG inject được, tách luồng bàn/câu/phương án; không sort ngẫu nhiên. Lưu bàn và option order, reload không reroll.
- Mỗi ô chọn đúng một câu; số0 không flood-fill; số lân cận tính tối đa8 ô, không wrap, không tính quà.
- Cắm cờ không mở ô, không lấy câu, không đổi tiền. Gỡ cờ trước khi mở.
- Chọn câu theo tiền trước khi mở ô; sau khi reserve lượt không được chọn ô khác, chốt tiền hoặc bỏ câu.
- Radio chỉ là lựa chọn; bấm xác nhận mới chấm. Không có lựa chọn thì không được submit. Hết giờ dù đã chọn nhưng chưa xác nhận vẫn tính sai.
- Sau chấm hiện đáp án đúng, lựa chọn, giải thích, delta tiền và kết quả quà/mạng; bấm tiếp tục để mở lượt sau hoặc xem kết thúc.

## 4. Tiền và kết thúc

```ts
const RULES = {
  rows:5, cols:5, mineCount:7, ordinarySafeCount:13,
  lifeGiftCount:2, bonusGiftCount:3, safeTotal:18,
  startingCashVnd:25_000, multiplierBaseVnd:25_000,
  cashCapVnd:150_000, safeGainVnd:12_000, boostedSafeGainVnd:24_000,
  safeWrongKeepNumerator:88, safeWrongKeepDenominator:100,
  startingLives:1, maxLives:3, firstClickOrdinarySafe:true,
} as const;
```

Tất cả tính bằng số nguyên VND. SAFE/quà sai: floor(C*88/100); mìn đúng: floor(C/2). Mìn sai nếu lives>1: lives−1 và floor(C/2); nếu lives=1: lives=0,C=0,BUSTED. Không làm tròn ngược lên hoặc tự đưa tiền về25.000.

Quà chỉ nhận nếu trả lời đúng. Giải quyết bonus theo thứ tự: đọc bonus từ lượt trước → tiêu thụ nó ở lượt này → nếu an toàn đúng thì cộng12.000/24.000 theo bonus cũ → nếu đúng tại ô bonus thì cấp bonus mới. Không nhân đôi tổng tiền. Bonus gặp mìn/sai/hết giờ mất, không stack; bonus→bonus đúng được tăng thưởng rồi cấp lại. Quà mạng thêm một sau khi tính tiền.

Mọi phép cộng dùng min(150.000,C+gain). Chốt chỉ giữa lượt sau ít nhất một câu đã xử lý, không trong ACTIVE/PAUSED/FEEDBACK. Auto end khi hết mạng, chạm cap hoặc mở đủ18 ô an toàn, kể cả ô sai. Ưu tiên BUSTED > CAP_REACHED > ALL_SAFE_OPENED. Kết quả được ghi một lần ngay lúc terminal, vẫn xem feedback rồi kết thúc; reload/tiếp tục không ghi lại.

Không có mìn hoặc sai:25.000+18*12.000=241.000 trước cap; ba bonus dùng đủ có thể thêm36.000, chặn trên277.000. Mọi đường đi vẫn bị chặn150.000. Vì tiền tăng nhanh hơn, có thể kết thúc trước khi mở hết18 ô; không bắt người chơi mở hết bàn mới được chốt. Trần áp dụng mỗi vòng, không phải cả lớp.

### Vector chuẩn cho test

| Input | Expected |
|---|---|
| SAFE đúng,25.000,không bonus | 37.000 |
| SAFE sai,25.000 | 22.000 |
| SAFE sai,25.001 | 22.000 |
| MINE đúng,25.001,lives2 | 12.500,lives2 |
| MINE sai,25.001,lives2 | 12.500,lives1 |
| MINE sai,25.000,lives1 | 0,lives0,BUSTED |
| BONUS_GIFT đúng,25.000,chưa bonus | 37.000,pendingBonus=true |
| SAFE đúng,25.000,có bonus | 49.000,pendingBonus=false |
| SAFE sai,25.000,có bonus | 22.000,pendingBonus=false |
| MINE đúng,25.000,có bonus | 12.500,pendingBonus=false |
| BONUS_GIFT đúng,25.000,có bonus | 49.000,pendingBonus=true |
| LIFE_GIFT đúng,25.000,lives1,có bonus | 49.000,lives2,pendingBonus=false |
| LIFE_GIFT sai,25.000,lives1 | 22.000,lives1 |
| SAFE đúng,145.000,có bonus | 150.000,delta+5.000,CAP_REACHED |

Các expected là hằng số độc lập trong test, không tính lại bằng hàm production.

## 5. HUD và tầng khó mới

- Luôn hiện THƯỞNG HIỆN TẠI, hệ số so với25.000đ, mạng, bonus, số an toàn đã mở/18 và trần150.000đ; không để panel câu hỏi che số tiền.
- Ban đầu25.000đ/x1,00; đúng SAFE đầu37.000đ/x1,48; sai SAFE từ25.000 còn22.000/x0,88. Không hardcode hệ số theo cơ sở10.000 cũ.
- Trong câu hỏi, giữ tiền trước chấm; dự báo phần cộng hiển thị riêng. Sau chấm cập nhật HUD, delta thật, số chốt, snapshot và lịch sử nhất quán.
- Nút chốt dùng đúng số tiền hiện có; đang hỏi thì khóa. BUSTED hiện0đ; kết thúc khác hiện đúng tiền đã chốt. Tổng các vòng hiển thị riêng.

| Tầng | Tiền trước lượt | Yêu cầu | Giây |
|---|---|---|---:|
|1|0–39.999|Lý giải quan hệ, phân biệt khái niệm lịch sử; không chỉ nhớ tên/ngày|25|
|2|40.000–64.999|Đánh giá cặp nhận định thuộc hai nội dung|25|
|3|65.000–94.999|Chẩn đoán lỗi trong các nhận định gần đúng|30|
|4|95.000–124.999|Phân tích tình huống và phản biện lập luận|30|
|5|125.000–149.999|Tổng hợp nhiều quan hệ, chọn tập nhận định phù hợp|30|

Tầng lấy cash nguyên TRƯỚC lượt, không lấy hệ số đã làm tròn, tọa độ hoặc loại ô. Sau penalty, tầng sau có thể giảm. Không đổi tầng/timer giữa câu.

## 6. Ngân hàng mới và cách chọn

- Trích JSON phụ lục vào file dữ liệu runtime, đọc mảng questions trong object metadata. Schema có id,difficulty,topic,familyId,format,prompt,options[{id,text}],correctOptionId,explanation,sourceRef.
- Đủ125 ID VNR mới,25 mỗi tầng; mỗi tầng có đủ25 familyId riêng. Bốn phương án khác nội dung, đáp án trỏ đúng một stable optionId. Nhãn A/B/C/D chỉ được gán sau xáo.
- 125 mục được tổ chức từ25 chủ đề neo với các hình thức nhận thức khác nhau; không quảng cáo125 chủ đề độc lập. Mức khó là thiết kế ban đầu, cần chạy thử để hiệu chuẩn.
- Trong vòng: lọc đúng tầng, loại questionId đã dùng và loại cả familyId đã dùng. Do mỗi tầng chứa đủ25 family và vòng tối đa25 lượt, vẫn có ít nhất một family chưa dùng cho mỗi lượt hợp lệ. Không fallback sang tầng khác.
- Giữa vòng: trong tập hợp lệ, ưu tiên exposureCount nhỏ nhất, rồi lastShownSequence cũ nhất, rồi RNG khi hòa. Persist history trong buổi; vòng mới không xóa history. Reserve câu tăng exposure đúng một lần và lưu cùng lượt.
- Xáo cả câu và phương án; reload giữ questionId, optionOrder, selection và deadline. Không lặp câu trong vòng, không quay về bank MLN nếu dữ liệu lỗi.
- Giải thích là nội dung chỉ hiện sau chấm. Các cặp nhận định có thể là cả đúng hoặc cả sai; không mặc định luôn một đúng một sai. Các bài tổng hợp có một tổ hợp đáp án duy nhất.
- Nội dung1954–1965 theo báo cáo đính kèm; không kéo sang toàn bộ1945–1975. Tránh đặt câu hỏi chấm ngày có cách gọi trận/chiến dịch hoặc sự kiện trong báo cáo dễ nhầm; không dùng riêng mốc tháng7 cho “chiến thắng Đồng Xoài” làm đáp án quyết định. Không suy Luật10/59 là nguyên nhân xảy ra trước Hội nghị15 tháng1/1959. Không hỏi mốc đảo chính và ngày mất Ngô Đình Diệm như cùng một ngày. Không dùng mốc thành lập Trung ương Cục thiếu phân biệt quyết định và thời điểm tổ chức hội nghị làm câu chấm ngày. Ngân hàng dưới tập trung quan hệ, không cần các mốc này để chọn đáp án.
- Kiểm tra schema không chứng minh chính xác học thuật. Rà từng đáp án trong phạm vi nguồn và các mệnh đề, ghi nhận sửa đổi nếu có; không tăng độ khó bằng câu mơ hồ hoặc phủ định kép.

## 7. Đồng hồ, tranh chấp sự kiện và state machine

### 7.1 State machine tối thiểu

`SETUP → READY → QUESTION_ACTIVE ↔ PAUSED → FEEDBACK → READY/FINISHED`.

Có thể có bước chuẩn bị/render trước QUESTION_ACTIVE, nhưng không được cho chọn thêm ô hoặc chốt khi đã reserve lượt. Mỗi active turn chứa: turnId, cellId, questionId, difficultyBeforeTurn, cashBeforeTurn, optionOrder, selectedOptionId, activatedAt/deadlineAt hoặc pausedRemainingMs, trạng thái đã giải quyết và kết quả.

- Engine là hàm thuần nhận state + command + thời gian/RNG được inject, trả state mới + effect hợp lệ; không đọc DOM, localStorage, Date.now hoặc Math.random trực tiếp trong luật.
- Tập trung chuyển trạng thái ở một đường xử lý. Nút UI chỉ gửi command; không tính tiền trong component và một lần nữa trong engine.
- Giải quyết một turnId tối đa một lần. Submit kép, timeout trùng submit, callback cũ, sự kiện sau khi kết thúc phải không làm thay đổi thưởng hoặc exposure lần nữa.
- Command có turnId cũ hoặc optionId không thuộc câu hiện tại phải bị từ chối, không bị tính là trả lời sai của người chơi.

### 7.2 Deadline

- Tính remaining từ deadline tuyệt đối, không trừ một biến mỗi tick làm nguồn chân lý.
- Chấp nhận đáp án khi thời điểm xử lý command `< deadlineAt`. Tại `now >= deadlineAt`, xử lý timeout. Kiểm tra điều kiện này cả trong submit, không phụ thuộc callback timeout đã chạy hay chưa.
- Bắt đầu deadline một lần khi nội dung và bốn phương án hiển thị; lưu ngay. Không bắt đầu lại vì rerender, chọn radio, thay đổi kích thước hay reload.
- Tạm dừng: lưu remainingMs, khóa submit và các thao tác chơi. Resume tạo deadline mới bằng now + remainingMs. Reload khi paused vẫn paused.
- Reload khi active: giữ deadline cũ; nếu đã hết thì giải quyết timeout một lần khi phục hồi. Không tự thưởng thêm thời gian vì tab ẩn hoặc trình duyệt bị đóng.
- Reload trong FEEDBACK giữ feedback và kết quả; không chấm lần nữa. Reload vòng đã chốt không tạo settlement mới.
- Khi người dẫn chương trình tạm dừng ở mốc đã hết hạn, timeout có ưu tiên; không cho pause để hồi sinh thời gian.

## 8. Persistence và xử lý lỗi

- Một snapshot có version lưu state vòng, history câu, option order, deadline/pause, kết quả lượt và ledger vòng. Dùng một key localStorage cho bản ghi chính để không lệch tiền và lịch sử khi ghi nhiều key riêng lẻ.
- Validate snapshot khi đọc: kiểu dữ liệu, cash nguyên trong [0,150.000], lives hợp lệ theo phase, bàn đúng kích thước và số loại ô, tham chiếu câu tồn tại, optionOrder là hoán vị đầy đủ, lượt và trạng thái phù hợp. Chặn snapshot thiếu/hỏng thay vì đoán ra dữ liệu tiền.
- Không silently reset vòng có dữ liệu không hợp lệ. Hiện thông báo dễ hiểu, cho tải bản sao dữ liệu để người dẫn chương trình giữ lại và bắt đầu vòng mới có xác nhận.
- Khi schemaVersion hoặc bankVersion không tương thích: không tiếp tục chấm lượt bằng nội dung khác; giữ lịch sử có thể đọc được và yêu cầu bắt đầu vòng mới qua UI rõ ràng.
- Ghi candidate snapshot trước khi commit thao tác thay đổi trạng thái lên UI. Nếu ghi lỗi/quota, khóa thao tác chơi và báo chưa thể lưu; giữ candidate trong bộ nhớ để retry, không replay command tính tiền. Chỉ tiếp tục khi lưu thành công hoặc người dẫn chương trình chủ động chọn bắt đầu lại theo luồng phục hồi.
- Tài nguyên static và câu hỏi bundled, không tải câu qua API mỗi lượt. Mạng lỗi không được biến thành đáp án sai.
- Không hỗ trợ chơi cùng một buổi từ nhiều tab đồng thời. Hiện hướng dẫn chỉ dùng một tab; nếu bổ sung khóa tab thì test nó, không tuyên bố localStorage tạo giao dịch đa tab hoặc chống sửa dữ liệu. Không dùng yêu cầu này để thêm backend vào bản đầu.
- Tên người chơi hiển thị dưới dạng text an toàn; không đưa input vào innerHTML. Không thu thập dữ liệu cá nhân ngoài tên hiển thị tùy chọn.

## 9. UI và điều khiển trên lớp

- Giao diện tiếng Việt, dễ đọc ở 1280×720 trở lên khi trình chiếu; responsive tối thiểu 390px để dùng điều khiển khi cần.
- Tên game “VNR202 — Dò mìn tri thức”; phong cách trò chơi học tập rõ ràng, không cần ảnh hoặc âm thanh ngoài mạng.
- Màn hình mở đầu có tên người chơi tùy chọn, luật ngắn, nút bắt đầu và tiếp tục vòng đang dở.
- Ô cờ dạng button có nhãn tọa độ, trạng thái và số liền kề khi đã mở; không chỉ phân biệt bằng màu. Có chỉ báo ô đang giải quyết.
- Phương án dùng điều khiển radio hoặc button có trạng thái selected rõ ràng. Hỗ trợ bàn phím, focus rõ, Enter xác nhận khi hợp lệ. Không để phím Enter đang giữ nộp nhiều lần.
- HUD và đồng hồ luôn nhìn được; tên tầng và số giây hiển thị rõ. Không chạy animation dài làm giảm thời gian đọc câu.
- Feedback có một giải thích ngắn và nút tiếp tục; màn kết thúc có tiền chốt, lý do, thống kê và bắt đầu người mới.
- Lịch sử buổi lưu kết quả đã chốt; tổng đã chốt hiển thị riêng với thưởng hiện tại để không gây nhầm.
- Có bật/tắt âm thanh tùy chọn, mặc định không làm gián đoạn lớp; tôn trọng prefers-reduced-motion.
- Ưu tiên không cần cuộn khi đọc câu ở màn chiếu; nếu câu dài, panel cuộn phải giữ HUD và vùng xác nhận nhìn thấy được.

## 10. Cấu trúc gợi ý

```text
src/
  domain/           # types, rules, state machine, money, board, selection
  data/questions.json
  application/      # command dispatcher, storage adapter, clock/RNG adapters
  ui/               # rendering and events only
  main.ts
tests/
  unit/
  integration/
  fixtures/
e2e/
scripts/validate-question-bank.*
README.md
TEST_REPORT.md
```

Cấu trúc có thể điều chỉnh theo repo, nhưng giữ ranh giới engine, persistence và UI có thể kiểm thử độc lập.

## 11. Unit tests bắt buộc

### 11.1 Tiền và lượt

- Mọi hàng trong bảng vector chuẩn tại mục 4.4.
- Làm tròn xuống đúng với số tiền lẻ, không âm hoặc vượt cap.
- Đúng/sai/hết giờ trên cả bốn cellType, có và không có bonus cũ; mạng có dự phòng và không có dự phòng.
- Quà chỉ cấp khi đúng; bonus mới không áp dụng ngược cho chính ô vừa cấp nó; bonus không cộng dồn.
- Trả lời đúng mìn giữ mạng; sai an toàn giữ mạng; bonus hết hiệu lực sau lượt mìn/sai.
- Chốt bị từ chối trước câu đầu và trong ACTIVE/PAUSED/FEEDBACK; đúng tiền trong READY.
- Cap, thua, mở đủ an toàn và ưu tiên terminalReason; settlement idempotent.
- Câu sai ở ô an toàn vẫn tăng số an toàn đã mở; cắm cờ không tăng.

### 11.2 Bàn

- Mỗi trong 25 vị trí có thể là ô đầu và luôn là ordinary-safe; count 7/13/2/3 đúng; không trùng vị trí hoặc mất ô.
- Test số lân cận bằng bàn fixture độc lập: góc, cạnh, giữa, không wrap hàng, quà không bị tính là mìn.
- Cùng seed và cùng đầu vào có bàn tái lập; biến đổi seed có thể tạo bàn khác. Không test ngẫu nhiên kiểu một lần chạy “hai bàn bắt buộc khác” vì xác suất trùng là hợp lệ.
- Kiểm tra trên tập seed cố định đủ rộng (ví dụ 1.000 seed) để phát hiện lỗi count/bounds/first click; không gọi đây là chứng minh thống kê đồng đều.
- Mỗi ô chỉ xử lý một lần; số 0 không flood-fill.

### 11.3 Câu hỏi và lựa chọn

- Validate đủ 125, đúng 25 mỗi tầng; lỗi duplicate ID, option rỗng/trùng, sai correctOptionId, difficulty ngoài miền và thiếu nguồn/giải thích.
- Threshold: 0,39.999 → tầng1;40.000,64.999 → tầng2;65.000,94.999 → tầng3;95.000,124.999 → tầng4;125.000,149.999 → tầng5.
- Không lấy difficulty từ multiplier đã format; không phụ thuộc cellType.
- Không lặp ID hoặc familyId trong vòng, giữ đúng tầng sau tăng/giảm tiền; chọn được 25 câu khác nhau cùng tầng trong vòng giả lập để kiểm tra dung lượng selector.
- Exposure tăng khi reserve lượt đúng một lần; vòng mới giữ history. Tầng chưa dùng hết ưu tiên câu chưa từng xuất hiện; khi dùng hết ưu tiên count thấp nhất rồi cũ nhất.
- Xáo phương án bảo toàn nội dung, stable IDs và đáp án; kiểm tra cả 24 hoán vị của bốn phương án bằng fixtures độc lập.
- Không tái chọn câu hoặc xáo lại khi restore.

### 11.4 Thời gian và state

- Submit ở deadline−1ms được chấp nhận; submit đúng deadline và deadline+1ms là timeout.
- Callback timeout muộn, callback cũ và submit kép không nhân đôi thưởng/exposure/ledger.
- Pause/resume giữ thời gian còn lại; pause khi đã hết hạn không cứu lượt; submit khi paused không đổi kết quả.
- Các event không hợp lệ cho phase hoặc turnId cũ không đổi state.
- Dùng fake clock/RNG được inject; không chờ 20–30 giây thật trong unit test.

## 12. Integration tests bắt buộc

Dùng UI/application thực với engine thực, storage in-memory hoặc jsdom và clock có kiểm soát. Chỉ mock ranh giới thời gian/RNG/storage lỗi; không mock engine để trả kết quả mong muốn.

1. Bắt đầu → chọn ô → câu hiện → chọn phương án → xác nhận → feedback → tiếp tục. Kiểm tra cash trên HUD, button chốt, feedback và snapshot cùng giá trị.
2. Thay lựa chọn trước nộp không chấm bài; bấm xác nhận chỉ ghi một lượt.
3. Ngân hàng thật chọn đúng tầng, thời gian đúng và chấm theo optionId sau đảo.
4. Nhận bonus → mở safe đúng; nhận bonus → mở mine; bonus → bonus đúng; bonus → life đúng; gift sai không cấp quà.
5. Nhận mạng → sai mìn được cứu → sai mìn tiếp khi chỉ còn một mạng thì thua.
6. Hết giờ khi chưa chọn và khi đã chọn nhưng chưa xác nhận đều là timeout, không tự nộp radio đang chọn.
7. Cash 25.000 sai safe → HUD 22.000 và x0,88; cash sau vượt ngưỡng làm câu SAU đổi tầng, câu hiện tại không đổi timer.
8. Dự báo thưởng và delta khi cap: gain danh nghĩa 24.000 nhưng cash145.000→150.000 thì delta chỉ +5.000.
9. Restore ACTIVE giữ câu/order/selection/deadline; restore quá hạn timeout một lần; restore PAUSED giữ pause; restore FEEDBACK/FINISHED không chấm lại.
10. Lưu lỗi: không hiện trạng thái đã commit rồi tiếp tục chơi; retry candidate không cộng tiền hai lần. Snapshot hỏng/version sai có luồng phục hồi rõ ràng.
11. Vòng mới giữ exposure/ledger, xóa dữ liệu buổi cần xác nhận; hủy xác nhận không đổi dữ liệu.
12. Chốt tiền hợp lệ ghi đúng một kết quả và tổng buổi; không được chốt trong câu hỏi.
13. Input tên người chơi chứa markup hiển thị như text, không thực thi hoặc tạo DOM ngoài ý muốn.

## 13. E2E tests bắt buộc

Playwright chạy Chromium trên build production được phục vụ HTTP local. Tối thiểu chạy các luồng chính ở desktop 1280×720; kiểm tra HUD/câu hỏi/submit ở viewport 390px.

### 13.1 Fixture tái lập

Cần một adapter fixture chỉ có trong test build, không có test hook lộ qua query string trong bản production công khai. Có thể dùng build mode riêng với compile-time flag; kiểm tra bản production bình thường không nhận các hook này. Tách thư mục artifact, ví dụ `dist` cho build public và `dist-e2e` cho build tối ưu dùng fixture. E2E có thể dùng hai webServer/cổng riêng; test E17 phải truy cập build public. Không để lệnh test ghi đè hoặc biến artifact chuẩn bị host thành bản có hook điều khiển.

Fixture không được mock phép chấm hoặc phép tính tiền. Chỉ inject bàn, thứ tự câu/option và clock. Sử dụng câu thật trong ngân hàng có đáp án biết trước; E2E chọn theo nội dung hoặc test fixture được test giữ ngoài bundle production.

Bàn tham chiếu, index theo hàng từ 0 đến 24:

```text
ordinarySafe: [0,4,7,8,9,10,11,12,13,14,15,16,17]
bonusGift: [1,2,3]
lifeGift: [5,6]
mine: [18,19,20,21,22,23,24]
firstClick: 0
```

Đây là danh sách dữ liệu kiểm thử, không phải bản đồ dùng cho các vòng thực. Ở bàn này ô 0 có 0 mìn liền kề; ô15 có2 mìn liền kề, ô17 có4 mìn liền kề.

### 13.2 Luồng kiểm thử

E01. Mở trang, nhập tên, bắt đầu: HUD 25.000đ, x1,00, một mạng, 25 ô kín. Chọn ô đầu, chắc chắn an toàn; HUD vẫn thấy trong câu hỏi.

E02. Đúng safe: 37.000đ; lần lượt xử lý các ô an toàn đúng để đi qua các ngưỡng và kiểm tra level/timer thay đổi theo cash trước lượt, không theo vị trí.

E03. Sai safe và timeout safe: đúng mức giữ 88%, không mất mạng; hiện giải thích và chỉ có một kết quả dù click nhanh nhiều lần.

E04. Đúng mine: mất nửa tiền, không mất mạng; sai mine với một mạng: tiền về 0, khóa bàn và chốt một kết quả thua.

E05. Nhận life rồi sai mine: mất một mạng và nửa tiền, được tiếp tục; không nhầm “còn một mạng” với đã thua.

E06. Bonus đúng ô kế tiếp cộng 24.000; bonus gặp mine/sai thì mất; chuỗi bonus→bonus cấp lại đúng; bonus→life vừa tăng tiền vừa nhận mạng.

E07. Chạy safe fixture theo thứ tự0,1,2,3,4,5,6,7 với đáp án đúng: tiền lần lượt37.000,49.000,73.000,97.000,121.000,133.000,145.000,150.000. Cap kết thúc trước khi mở hết18 an toàn; lives=3. Settlement đúng một lần sau reload/tiếp tục. Không cố mở thêm ô8 để tăng tiền.

E08. Luồng không chạm cap: trả lời SAI ô0, trả lời ĐÚNG toàn bộ7 mìn18..24, rồi trả lời SAI toàn bộ17 ô an toàn còn lại. Mở đủ18 an toàn thì kết thúc ALL_SAFE_OPENED; không mất mạng ở các mìn đúng hoặc an toàn sai. Expected tiền được tính độc lập theo từng bước, không dùng engine làm oracle. Không đòi tiền bằng150.000 để được kết thúc hợp lệ.

E09. Chốt thưởng giữa lượt: hủy không đổi tiền; xác nhận chốt đúng số, khóa bàn; reload vẫn kết quả đó; vòng mới reset tiền25.000 và giữ lịch sử buổi.

E10. Reload giữa câu: cùng questionId, order và lựa chọn đã chọn; thời gian không quay lại đầy. Tiến clock qua hạn rồi reload: timeout một lần, không tự chọn câu mới.

E11. Pause, tiến clock, reload vẫn pause; resume còn đúng thời gian; submit khi paused không chấm.

E12. Deadline race: submit đúng mốc hết giờ hoặc fire hai callback cùng turn không nhân đôi phạt/tiền. Kiểm tra UI và snapshot.

E13. Chơi nhiều vòng ngắn: câu đã dùng trong buổi chưa được ưu tiên lại nếu tầng còn câu chưa xuất hiện. Reload không xóa history; sau khi tầng đã dùng đủ25, dùng lại có kiểm soát và vẫn không lặp trong vòng hiện tại.

E14. Dữ liệu localStorage hỏng hoặc bankVersion không tương thích: không hiện bàn đang chơi với tiền tự đoán; có thông báo phục hồi và xác nhận vòng mới.

E15. Desktop và mobile: HUD không bị panel che; thao tác bàn phím chọn và submit được; trạng thái selected/focus rõ, không dựa vào màu; không có lỗi console bất ngờ hoặc request ngoài cần thiết để chơi.

E16. Cắm cờ/gỡ cờ: không gọi câu, không tính một ô mở; ô 0 không tự mở các ô kế bên.

E17. Kiểm tra bản production thông thường không nhận fixture/test-control qua query hoặc window global. Chỉ test build riêng được inject fixture.

### 13.3 Độ ổn định test

- Không dùng sleep/waitForTimeout dài hoặc chờ thật từng câu. Dùng fake clock/browser clock và assertion có điều kiện; browser clock phải được cài trước các API clock liên quan.
- Độc lập context/storage giữa test, riêng test nhiều vòng cố ý giữ session. Không phụ thuộc thứ tự chạy test hoặc mạng bên ngoài.
- Không sửa ngẫu nhiên toàn cục làm vô tình thay cả trình duyệt; inject RNG tại ranh giới app.
- Không tăng timeout, thêm retry hoặc skip chỉ để che lỗi trạng thái. Nếu retry do hạ tầng, ghi rõ; chạy lại test từng flaky trước khi kết luận.
- Trên môi trường không tải được browser: vẫn hoàn thành test code và các kiểm tra chạy được, nêu chính xác blocker và lệnh cần chạy ở môi trường khác; không tuyên bố E2E đã pass.

## 14. Coverage, CI và lệnh chạy

Các script package tối thiểu:

```text
npm run dev
npm run typecheck
npm run lint
npm run validate:bank
npm run test:unit
npm run test:integration
npm run test:coverage
npm run build
npm run preview
npm run test:e2e
npm run verify
```

- `test:unit` và `test:integration` chạy đúng thư mục riêng; `test:coverage` chạy cả hai một lần và tổng hợp coverage.
- `verify` lần lượt chạy typecheck, lint, validate:bank, test:coverage, build rồi E2E; mọi bước bắt buộc phải ảnh hưởng exit code.
- Dùng Vitest coverage v8 hoặc provider phù hợp; gồm các file production chưa được test, không chỉ file đã import. Domain: tối thiểu95% lines/statements/functions và95% branches. Toàn bộ mã ứng dụng tính coverage: tối thiểu85% lines/statements/functions và85% branches. Không giảm ngưỡng hoặc exclude engine để lách.
- Nếu một nhánh không thể đạt, xem lại thiết kế hoặc giải thích rõ; không đánh dấu ignore bừa. Coverage không thay thế các ca kiểm thử nghiệp vụ.
- E2E phục vụ dist trên cổng cố định, có strict port, health/readiness check và cấu hình baseURL. `vite preview` chỉ dùng kiểm tra build local, không gọi đó là server production triển khai công khai.
- CI khi repo hỗ trợ: cài theo lockfile, lint/typecheck/bank, coverage, build, cài browser và chạy E2E; upload báo cáo/trace khi lỗi. Không phụ thuộc tài khoản dịch vụ hoặc secret cho các kiểm tra local này.
- Có `TEST_REPORT.md`: ghi phiên bản runtime, ngày chạy, lệnh thật, số test unit/integration/E2E, coverage từng nhóm và overall, kết quả build, lỗi/blocker. Phân biệt đọc rà học thuật câu hỏi với test tự động về schema.

## 15. Hướng dẫn host và bàn giao

- README có lệnh cài phụ thuộc và browser, dev, build, preview, verify; giải thích yêu cầu runtime đúng với lockfile.
- Build ra thư mục static (thường dist). Hướng dẫn host từ root hoặc subpath và cấu hình base phù hợp; refresh URL không làm mất app hoặc vòng đang dở.
- Không cần kết nối15 máy vì chỉ một máy chơi/chiếu. Không thêm backend để “dự phòng” chế độ nhiều người.
- Nếu môi trường hiện tại có cơ chế preview thì cung cấp link preview đã kiểm tra. Nếu chưa triển khai công khai thì giao dist và hướng dẫn, không tự ghi một URL host chưa tồn tại.
- Không chỉ nói “có thể viết test”. Phải có file test, cấu hình và kết quả chạy thật theo khả năng môi trường.
- Tự sửa lỗi trong phạm vi này đến khi đáp ứng tiêu chí. Chỉ hỏi lại nếu gặp thiếu thông tin thực sự chặn công việc; các lựa chọn đã quyết định trong prompt không cần xác nhận lại.

## 16. Checklist nghiệm thu

- [ ] Bàn đủ25 ô, đúng7 mìn/13 thường/2 mạng/3 bonus; đầu tiên luôn thường an toàn.
- [ ] HUD tiền hiện tại cập nhật đúng ở mọi phase, không bị câu hỏi che; chốt, feedback và ledger thống nhất.
- [ ] Mọi luật thưởng/phạt, thời gian, mạng và thứ tự bonus đúng vector chuẩn.
- [ ] Không thể cộng tiền hai lần, chốt giữa câu, mở lại ô hoặc reload để đổi câu/đặt lại timer.
- [ ] Ngân hàng125, 25 mỗi tầng, bốn phương án hợp lệ, một đáp án theo stable ID, giữ giải thích và nguồn.
- [ ] Không lặp câu trong vòng; xáo và ưu tiên ít xuất hiện qua các vòng; lịch sử tồn tại sau reload.
- [ ] Đủ unit, integration, E2E nêu trên; báo cáo trung thực; coverage không bị lách bằng exclude hoặc skip.
- [ ] Build production hoạt động qua HTTP, không gọi API ngoài để chơi; không lộ hook điều khiển fixture trong production.
- [ ] README và TEST_REPORT đủ để người khác tái lập việc chạy và kiểm thử.

## 17. Tài liệu kỹ thuật chính thức

Tra phiên bản tài liệu phù hợp với phiên bản thư viện thực sự cài:

- Vite build: https://vite.dev/guide/build
- Vite static deploy/base: https://vite.dev/guide/static-deploy
- Vitest coverage: https://vitest.dev/guide/coverage
- Vitest fake timers: https://vitest.dev/guide/mocking/timers
- Playwright clock: https://playwright.dev/docs/clock
- Playwright test timeouts: https://playwright.dev/docs/test-timeouts


## 18. Test migration bắt buộc

- Unit: chỉ chấp nhận courseId/bankVersion/schema VNR mới; ID và familyId đều VNR,125 câu và25family mỗi tầng. State MLN đang active không được chấm bằng câu VNR.
- Integration: nạp snapshot/exposure MLN, chạy migration, giữ nguyên key của app khác; VNR bắt đầu25.000đ,7bom,history câu VNR sạch. Chạy migration lần hai không xóa vòng VNR đã chơi. Lưu thất bại không để trạng thái lẫn hai bank.
- E2E: fixture dữ liệu localStorage cũ → mở app → thông báo cập nhật → bắt đầu VNR. Refresh giữa câu VNR giữ nguyên lượt, không kích hoạt migration lại. Kiểm tra cache app cũ đúngscope nếu app có service worker.
- Build audit: tìm các ID câu cũ hoặc chuỗi câu MLN trong assets/bundle public và các import đang dùng; không được còn dữ liệu bank cũ. Chuỗi tên namespace cũ được phép nằm trong code migration để nhận diện/xóa, không phải bằng chứng còn ngân hàng. Kiểm tra không còn endpoint/fallback/course switch trả bank MLN.
- Hành vi chọn câu: simulate25 lượt chọn cùng tầng không lặpfamily; simulate trộn tầng25 lượt vẫn đủ family hợp lệ. Chốt15 ô an toàn chưa được coi là ALL_SAFE_OPENED trong bản18 an toàn.
- Có regression xác nhận cấu hình cũ không còn điều khiển runtime: thưởng SAFE12.000, bonus24.000, khởi điểm25.000, mẫu số hệ số25.000,7mìn và18an toàn.

## 19. Phụ lục —125 câu VNR202

Nguồn: VNR202_Bao_cao_chi_tiet_Muc_II1_1954_1965_co_bang_phan_cong.docx(1).pdf, chương2 mụcII.1; sourceRef dùng số trang in trên báo cáo. Đây là các câu hỏi mới của VNR, không phải bank MLN đổi tên. Các tình huống là bài tập giả định; phần giải thích và nguồn đi kèm để rà đáp án.

```json
{
  "schemaVersion": 2,
  "bankVersion": "vnr202-1954-1965-hard-125-v1",
  "courseId": "VNR202",
  "language": "vi",
  "sourceDocument": "VNR202_Bao_cao_chi_tiet_Muc_II1_1954_1965_co_bang_phan_cong.docx(1).pdf",
  "editorialNote": "125 mục gồm25 chủ đề neo,25 câu lý giải,25 cặp nhận định,25 câu chẩn đoán lỗi,25 tình huống và25 bài tổng hợp; không phải125 chủ đề độc lập. Độ khó chưa được hiệu chuẩn thực nghiệm. Tránh câu hỏi ngày cụ thể có cách gọi sự kiện/chiến dịch dễ lẫn trong nguồn.",
  "questions": [
    {
      "id": "vnr-1-01",
      "difficulty": 1,
      "topic": "Hai nhiệm vụ chiến lược",
      "familyId": "vnr-family-01",
      "format": "reasoning",
      "prompt": "Cơ sở nào giải thích việc xác định nhiệm vụ khác nhau ở hai miền sau năm 1954?",
      "options": [
        {
          "id": "o1",
          "text": "Hai miền cùng hoàn thành giải phóng dân tộc nên cùng chuyển sang cải tạo xã hội chủ nghĩa."
        },
        {
          "id": "o2",
          "text": "Hai miền có mục tiêu độc lập riêng nên cần tổ chức hai đường lối không liên hệ."
        },
        {
          "id": "o3",
          "text": "Khác biệt nhiệm vụ chủ yếu xuất phát từ địa hình, không từ tình hình chính trị."
        },
        {
          "id": "o4",
          "text": "Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Sự thống nhất mục tiêu không xóa khác biệt điều kiện và nhiệm vụ của mỗi miền.",
      "sourceRef": "A.1–A.3, tr.3–5; C.1, tr.9"
    },
    {
      "id": "vnr-1-02",
      "difficulty": 1,
      "topic": "Độc lập tự chủ và quốc tế",
      "familyId": "vnr-family-02",
      "format": "reasoning",
      "prompt": "Trong bối cảnh quốc tế có cả hỗ trợ và bất đồng, định hướng nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Từ chối hỗ trợ quốc tế để chứng minh khả năng tự chủ."
        },
        {
          "id": "o2",
          "text": "Điều chỉnh mục tiêu thống nhất theo yêu cầu của từng bên viện trợ."
        },
        {
          "id": "o3",
          "text": "Giữ độc lập, tự chủ đồng thời tranh thủ sự ủng hộ quốc tế."
        },
        {
          "id": "o4",
          "text": "Lựa chọn một nước làm bên quyết định đường lối để bảo đảm viện trợ."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tự chủ trong đường lối có thể đi cùng tranh thủ nguồn lực bên ngoài.",
      "sourceRef": "A.2, tr.4"
    },
    {
      "id": "vnr-1-03",
      "difficulty": 1,
      "topic": "Khôi phục nông nghiệp",
      "familyId": "vnr-family-03",
      "format": "reasoning",
      "prompt": "Vì sao khôi phục nông nghiệp là trọng tâm cấp bách ở miền Bắc sau năm 1954?",
      "options": [
        {
          "id": "o1",
          "text": "Ưu tiên nông nghiệp có nghĩa chưa cần củng cố chính quyền và an ninh."
        },
        {
          "id": "o2",
          "text": "Nông nghiệp giữ vai trò chủ yếu, gắn trực tiếp lương thực, sinh kế và ổn định xã hội."
        },
        {
          "id": "o3",
          "text": "Nông nghiệp phải thay thế mọi nhiệm vụ công nghiệp và giao thông trong suốt thời kỳ."
        },
        {
          "id": "o4",
          "text": "Nông nghiệp đã hoàn thành hiện đại hóa nên có thể tạo nguồn xuất khẩu lớn ngay."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo.",
      "sourceRef": "B.1, tr.5–6"
    },
    {
      "id": "vnr-1-04",
      "difficulty": 1,
      "topic": "Tiếp quản và xây dựng",
      "familyId": "vnr-family-04",
      "format": "reasoning",
      "prompt": "Ý nghĩa nào của việc tiếp quản miền Bắc liên hệ trực tiếp công cuộc xây dựng sau chiến tranh?",
      "options": [
        {
          "id": "o1",
          "text": "Tạo điều kiện quản lý thống nhất, phục hồi sản xuất và các dịch vụ thiết yếu."
        },
        {
          "id": "o2",
          "text": "Chứng minh cơ sở vật chất cho chủ nghĩa xã hội đã được xây dựng đầy đủ."
        },
        {
          "id": "o3",
          "text": "Kết thúc nhu cầu củng cố an ninh và tổ chức lại bộ máy địa phương."
        },
        {
          "id": "o4",
          "text": "Hoàn thành cả nhiệm vụ giải phóng miền Nam và thống nhất quốc gia."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Tiếp quản tạo điều kiện chính trị – quản lý, không đồng nghĩa hoàn thành mọi nhiệm vụ kinh tế hoặc thống nhất.",
      "sourceRef": "B.1, tr.5–6"
    },
    {
      "id": "vnr-1-05",
      "difficulty": 1,
      "topic": "Kết quả cải cách ruộng đất",
      "familyId": "vnr-family-05",
      "format": "reasoning",
      "prompt": "Tác động cơ bản của việc chia ruộng đất cho nông dân là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Đồng nghĩa đã hoàn thành hợp tác hóa nông nghiệp trên toàn miền Bắc."
        },
        {
          "id": "o2",
          "text": "Chứng minh không có sai lầm trong phân loại và xử lý đối tượng."
        },
        {
          "id": "o3",
          "text": "Thay thế mọi nhu cầu về thủy lợi và tổ chức lao động trong sản xuất."
        },
        {
          "id": "o4",
          "text": "Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Thay đổi sở hữu là một kết quả cần phân biệt với hợp tác hóa, kỹ thuật sản xuất và chất lượng tổ chức thực hiện.",
      "sourceRef": "B.2, tr.6"
    },
    {
      "id": "vnr-1-06",
      "difficulty": 1,
      "topic": "Sai lầm và sửa sai",
      "familyId": "vnr-family-06",
      "format": "reasoning",
      "prompt": "Nguyên nhân nào được báo cáo nhấn mạnh khi phân tích sai lầm cải cách ruộng đất?",
      "options": [
        {
          "id": "o1",
          "text": "Từ bỏ đấu tranh giai cấp và chỉ dựa vào thỏa thuận với địa chủ."
        },
        {
          "id": "o2",
          "text": "Thực hiện quản lý dân chủ hợp tác xã làm thay đổi mục tiêu cải cách."
        },
        {
          "id": "o3",
          "text": "Chủ quan, giáo điều và đánh giá không đầy đủ quan hệ xã hội thực tế."
        },
        {
          "id": "o4",
          "text": "Coi trọng điều tra tình hình đến mức không còn tổ chức thực hiện."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Báo cáo liên hệ sai lầm với áp dụng giáo điều, cường điệu đấu tranh giai cấp và phân loại sai.",
      "sourceRef": "B.2, tr.6"
    },
    {
      "id": "vnr-1-07",
      "difficulty": 1,
      "topic": "Cải tạo và phát triển",
      "familyId": "vnr-family-07",
      "format": "reasoning",
      "prompt": "Vì sao cải tạo quan hệ sản xuất phải gắn với phát triển lực lượng sản xuất?",
      "options": [
        {
          "id": "o1",
          "text": "Phát triển lực lượng sản xuất làm mất nhu cầu cải tạo quan hệ sản xuất."
        },
        {
          "id": "o2",
          "text": "Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất."
        },
        {
          "id": "o3",
          "text": "Chỉ cần đổi sở hữu thì năng suất tự tăng, không cần tích lũy vật chất."
        },
        {
          "id": "o4",
          "text": "Phải hoàn thành công nghiệp hóa mới được tổ chức lại quan hệ sản xuất."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Hai mặt có liên hệ, không được tách rời hoặc coi một mặt tự động thay thế mặt kia.",
      "sourceRef": "B.3, tr.7; C.3, tr.10–11"
    },
    {
      "id": "vnr-1-08",
      "difficulty": 1,
      "topic": "Nguyên tắc hợp tác xã",
      "familyId": "vnr-family-08",
      "format": "reasoning",
      "prompt": "Phương án nào nêu đúng các nguyên tắc xây dựng hợp tác xã nông nghiệp?",
      "options": [
        {
          "id": "o1",
          "text": "Tự nguyện, cùng có lợi và quản lý dân chủ."
        },
        {
          "id": "o2",
          "text": "Tự nguyện, phân phối bình quân và quản lý dân chủ."
        },
        {
          "id": "o3",
          "text": "Tham gia theo chỉ tiêu, cùng có lợi và quản lý dân chủ."
        },
        {
          "id": "o4",
          "text": "Tự nguyện, cùng có lợi và giao chủ nhiệm mọi quyền quyết định."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Không thay cùng có lợi bằng bình quân hoặc thay dân chủ bằng quyết định đơn phương.",
      "sourceRef": "B.3, tr.7"
    },
    {
      "id": "vnr-1-09",
      "difficulty": 1,
      "topic": "Cải tạo công thương nghiệp",
      "familyId": "vnr-family-09",
      "format": "reasoning",
      "prompt": "Chủ trương cải tạo công thương nghiệp tư bản tư doanh được báo cáo mô tả theo hướng nào?",
      "options": [
        {
          "id": "o1",
          "text": "Tập thể hóa toàn bộ công thương nghiệp bằng tổ đổi công nông nghiệp."
        },
        {
          "id": "o2",
          "text": "Chỉ giữ nguyên kinh tế tư doanh, không chuyển đổi quan hệ sở hữu."
        },
        {
          "id": "o3",
          "text": "Dùng phát triển thị trường thay toàn bộ mục tiêu cải tạo sở hữu."
        },
        {
          "id": "o4",
          "text": "Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Phải phân biệt hình thức cải tạo công thương nghiệp với tổ chức hợp tác hóa trong nông nghiệp.",
      "sourceRef": "B.3, tr.7"
    },
    {
      "id": "vnr-1-10",
      "difficulty": 1,
      "topic": "Miền Nam 1954–1958",
      "familyId": "vnr-family-10",
      "format": "reasoning",
      "prompt": "Chuyển trọng tâm sang đấu tranh chính trị trong những năm đầu sau Giơnevơ nhằm yêu cầu nào?",
      "options": [
        {
          "id": "o1",
          "text": "Phát động ngay các chiến dịch quân sự quy mô lớn trên toàn miền Nam."
        },
        {
          "id": "o2",
          "text": "Chấm dứt hoạt động trong dân để chỉ dựa vào thương lượng quốc tế."
        },
        {
          "id": "o3",
          "text": "Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới."
        },
        {
          "id": "o4",
          "text": "Từ bỏ mục tiêu thống nhất và chuyển sang xây dựng chủ nghĩa xã hội ở miền Nam."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Đấu tranh chính trị gắn mục tiêu thống nhất với điều chỉnh tổ chức và bảo toàn lực lượng.",
      "sourceRef": "B.4, tr.7–8"
    },
    {
      "id": "vnr-1-11",
      "difficulty": 1,
      "topic": "Nghị quyết Trung ương 15",
      "familyId": "vnr-family-11",
      "format": "reasoning",
      "prompt": "Điểm chuyển biến phương thức đấu tranh gắn Nghị quyết Trung ương 15 là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Lấy vận động quốc tế thay việc xây dựng lực lượng tại miền Nam."
        },
        {
          "id": "o2",
          "text": "Kết hợp đấu tranh chính trị với đấu tranh vũ trang, phát huy sức mạnh quần chúng."
        },
        {
          "id": "o3",
          "text": "Thay thế phong trào chính trị bằng hoạt động quân sự tách khỏi quần chúng."
        },
        {
          "id": "o4",
          "text": "Giữ đấu tranh chính trị đơn thuần dù mức đàn áp thay đổi."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị.",
      "sourceRef": "B.5, tr.8–9"
    },
    {
      "id": "vnr-1-12",
      "difficulty": 1,
      "topic": "Đồng khởi",
      "familyId": "vnr-family-12",
      "format": "reasoning",
      "prompt": "Vì sao Đồng khởi được xem là bước ngoặt của cách mạng miền Nam?",
      "options": [
        {
          "id": "o1",
          "text": "Góp phần chuyển từ giữ gìn lực lượng sang thế tiến công và mở rộng quyền làm chủ."
        },
        {
          "id": "o2",
          "text": "Hoàn thành ngay giải phóng miền Nam và thống nhất cả nước."
        },
        {
          "id": "o3",
          "text": "Thay thế vai trò tổ chức chính trị bằng quân đội từ miền Bắc."
        },
        {
          "id": "o4",
          "text": "Đưa cách mạng trở lại chủ yếu giữ gìn lực lượng, không phát triển đấu tranh."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Bước ngoặt về thế cách mạng cần phân biệt với thắng lợi cuối cùng.",
      "sourceRef": "B.5, tr.8–9; E.2, tr.15"
    },
    {
      "id": "vnr-1-13",
      "difficulty": 1,
      "topic": "Mặt trận giải phóng",
      "familyId": "vnr-family-13",
      "format": "reasoning",
      "prompt": "Vai trò nổi bật của Mặt trận Dân tộc giải phóng miền Nam Việt Nam là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Thay các tuyến vận tải trong việc trực tiếp chuyên chở vật chất từ miền Bắc."
        },
        {
          "id": "o2",
          "text": "Thống nhất mọi hoạt động thành nhiệm vụ xây dựng kinh tế miền Bắc."
        },
        {
          "id": "o3",
          "text": "Chỉ tổ chức các đơn vị quân đội, không tập hợp lực lượng chính trị."
        },
        {
          "id": "o4",
          "text": "Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Vai trò mặt trận là chính trị – đoàn kết rộng rãi; không đồng nhất với tuyến hậu cần hoặc chỉ huy quân sự.",
      "sourceRef": "B.5, tr.9; D.5, tr.14"
    },
    {
      "id": "vnr-1-14",
      "difficulty": 1,
      "topic": "Đại hội III và hai chiến lược",
      "familyId": "vnr-family-14",
      "format": "reasoning",
      "prompt": "Đường lối Đại hội III kết hợp hai nhiệm vụ nào?",
      "options": [
        {
          "id": "o1",
          "text": "Hoàn tất xã hội chủ nghĩa ở cả hai miền trước khi đấu tranh thống nhất."
        },
        {
          "id": "o2",
          "text": "Chỉ giải phóng miền Nam, hoãn nhiệm vụ xây dựng miền Bắc đến sau chiến tranh."
        },
        {
          "id": "o3",
          "text": "Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam."
        },
        {
          "id": "o4",
          "text": "Cách mạng dân tộc dân chủ ở miền Bắc và xã hội chủ nghĩa ở miền Nam."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Hai nhiệm vụ khác tính chất nhưng đồng thời và cùng hướng mục tiêu chung.",
      "sourceRef": "C.1–C.2, tr.9–10"
    },
    {
      "id": "vnr-1-15",
      "difficulty": 1,
      "topic": "Quyết định nhất và trực tiếp",
      "familyId": "vnr-family-15",
      "format": "reasoning",
      "prompt": "Phân biệt nào đúng về vai trò hai miền?",
      "options": [
        {
          "id": "o1",
          "text": "Vai trò quyết định nhất cho phép miền Bắc thay thế lực lượng cách mạng tại miền Nam."
        },
        {
          "id": "o2",
          "text": "Miền Bắc quyết định nhất đối với cả nước; miền Nam quyết định trực tiếp đối với giải phóng miền Nam."
        },
        {
          "id": "o3",
          "text": "Miền Bắc quyết định trực tiếp giải phóng miền Nam; miền Nam quyết định nhất đối với cả nước."
        },
        {
          "id": "o4",
          "text": "Hai miền đều quyết định trực tiếp theo cùng một nghĩa nên không cần phân biệt."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Hai phạm vi quyết định khác nhau: nền tảng chiến lược toàn cục và đấu tranh trực tiếp giải phóng miền Nam.",
      "sourceRef": "C.2, tr.10"
    },
    {
      "id": "vnr-1-16",
      "difficulty": 1,
      "topic": "Hòa bình và chuẩn bị",
      "familyId": "vnr-family-16",
      "format": "reasoning",
      "prompt": "Vì sao chủ trương thống nhất bằng hòa bình đi cùng chuẩn bị đối phó chiến tranh mở rộng?",
      "options": [
        {
          "id": "o1",
          "text": "Mục tiêu hòa bình cần được bảo vệ bằng cảnh giác và chuẩn bị trước nguy cơ thực tế."
        },
        {
          "id": "o2",
          "text": "Chuẩn bị quốc phòng chứng tỏ đã từ bỏ phương hướng hòa bình."
        },
        {
          "id": "o3",
          "text": "Kiên trì hòa bình cho phép không cần dự kiến tình huống quân sự."
        },
        {
          "id": "o4",
          "text": "Hai yêu cầu thuộc hai miền nên không có quan hệ trong đường lối chung."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Mục tiêu và việc chuẩn bị bảo vệ mục tiêu có thể bổ sung nhau, không tất yếu mâu thuẫn.",
      "sourceRef": "C.1, tr.9–10"
    },
    {
      "id": "vnr-1-17",
      "difficulty": 1,
      "topic": "Công nghiệp hóa hợp lý",
      "familyId": "vnr-family-17",
      "format": "reasoning",
      "prompt": "Định hướng ưu tiên công nghiệp nặng được hiểu đúng thế nào?",
      "options": [
        {
          "id": "o1",
          "text": "Dừng nông nghiệp để dồn nguồn lực cho công nghiệp nặng đến khi hoàn tất."
        },
        {
          "id": "o2",
          "text": "Chỉ phát triển công nghiệp nhẹ, hoãn xây dựng cơ sở vật chất dài hạn."
        },
        {
          "id": "o3",
          "text": "Dùng công nghiệp nặng thay nhiệm vụ giáo dục, khoa học và đời sống."
        },
        {
          "id": "o4",
          "text": "Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Ưu tiên không đồng nghĩa độc tôn một ngành hoặc bỏ phối hợp các mặt phát triển.",
      "sourceRef": "C.3, tr.10–11"
    },
    {
      "id": "vnr-1-18",
      "difficulty": 1,
      "topic": "Kế hoạch1961–1965",
      "familyId": "vnr-family-18",
      "format": "reasoning",
      "prompt": "Đánh giá nào phù hợp về Kế hoạch năm năm lần thứ nhất khi chiến tranh mở rộng?",
      "options": [
        {
          "id": "o1",
          "text": "Hoàn thành mục tiêu chủ yếu có nghĩa không cần xét thay đổi hoàn cảnh."
        },
        {
          "id": "o2",
          "text": "Chỉ cần thống kê phong trào thi đua, không cần xét tiềm lực và đời sống."
        },
        {
          "id": "o3",
          "text": "Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả."
        },
        {
          "id": "o4",
          "text": "Không thực hiện nguyên vẹn trong hòa bình đồng nghĩa không có kết quả đáng kể."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Đánh giá kế hoạch phải gắn mục tiêu, kết quả và điều kiện lịch sử, tránh kết luận tuyệt đối.",
      "sourceRef": "D.1, tr.11–12"
    },
    {
      "id": "vnr-1-19",
      "difficulty": 1,
      "topic": "Hệ thống chi viện",
      "familyId": "vnr-family-19",
      "format": "reasoning",
      "prompt": "Vì sao chi viện miền Nam phải được tổ chức thành hệ thống liên tục?",
      "options": [
        {
          "id": "o1",
          "text": "Chi viện là hoạt động riêng không liên hệ mục tiêu phát triển miền Bắc."
        },
        {
          "id": "o2",
          "text": "Sản xuất, chuẩn bị nhân lực, hậu cần và vận tải phải phối hợp từ hậu phương tới chiến trường."
        },
        {
          "id": "o3",
          "text": "Chỉ mở đường vận tải là đủ, có thể bỏ khâu sản xuất và tổ chức tiếp nhận."
        },
        {
          "id": "o4",
          "text": "Nguồn chi viện có thể thay toàn bộ lực lượng tại chỗ của miền Nam."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Chi viện nối nhiều khâu và nhiều lực lượng, không phải một tuyến đường độc lập.",
      "sourceRef": "D.2, tr.12"
    },
    {
      "id": "vnr-1-20",
      "difficulty": 1,
      "topic": "Chiến tranh đặc biệt",
      "familyId": "vnr-family-20",
      "format": "reasoning",
      "prompt": "Sự kết hợp nào phản ánh đúng cơ chế chiến lược Chiến tranh đặc biệt?",
      "options": [
        {
          "id": "o1",
          "text": "Quân đội Sài Gòn chiến đấu chủ yếu, có cố vấn và phương tiện Mỹ cùng biện pháp kiểm soát dân cư."
        },
        {
          "id": "o2",
          "text": "Quân viễn chinh Mỹ chiến đấu chủ yếu và không cần quân đội Sài Gòn."
        },
        {
          "id": "o3",
          "text": "Mỹ chỉ hỗ trợ kinh tế, không tham gia cố vấn và phương tiện quân sự."
        },
        {
          "id": "o4",
          "text": "Chương trình kiểm soát dân cư tách rời và không phục vụ hoạt động quân sự."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược.",
      "sourceRef": "D.3, tr.12–13"
    },
    {
      "id": "vnr-1-21",
      "difficulty": 1,
      "topic": "Hai chân ba mũi ba vùng",
      "familyId": "vnr-family-21",
      "format": "reasoning",
      "prompt": "Cách phân biệt nào đúng về ba mũi giáp công và ba vùng chiến lược?",
      "options": [
        {
          "id": "o1",
          "text": "Ba mũi là quân sự, chính trị, ngoại giao; ba vùng là Bắc, Trung, Nam."
        },
        {
          "id": "o2",
          "text": "Ba mũi là miền núi, đồng bằng, đô thị; ba vùng là quân sự, chính trị, binh vận."
        },
        {
          "id": "o3",
          "text": "Ba mũi là kinh tế, văn hóa, quân sự; ba vùng là hậu phương, tiền tuyến, quốc tế."
        },
        {
          "id": "o4",
          "text": "Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Không nhầm hình thức tiến công, loại địa bàn và phân chia địa lý toàn quốc.",
      "sourceRef": "D.4, tr.13–14"
    },
    {
      "id": "vnr-1-22",
      "difficulty": 1,
      "topic": "Phá ấp chiến lược",
      "familyId": "vnr-family-22",
      "format": "reasoning",
      "prompt": "Vì sao chống ấp chiến lược không chỉ là nhiệm vụ đánh đồn?",
      "options": [
        {
          "id": "o1",
          "text": "Chỉ vận động dân sinh mới cần thiết, quân sự không có vai trò hỗ trợ."
        },
        {
          "id": "o2",
          "text": "Ấp chiến lược chỉ là đơn vị kinh tế nên không liên quan bình định."
        },
        {
          "id": "o3",
          "text": "Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận."
        },
        {
          "id": "o4",
          "text": "Phá xong một đồn là tự động kết thúc mọi hình thức kiểm soát nông thôn."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Hệ thống kiểm soát có nhiều mặt; ba mũi bổ sung nhau để tác động toàn diện.",
      "sourceRef": "D.3–D.4, tr.12–14"
    },
    {
      "id": "vnr-1-23",
      "difficulty": 1,
      "topic": "Tổ chức lực lượng",
      "familyId": "vnr-family-23",
      "format": "reasoning",
      "prompt": "Ý nghĩa của thống nhất lực lượng vũ trang miền Nam thành Quân giải phóng là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Tách hoạt động vũ trang khỏi mục tiêu và chỉ đạo cách mạng chung."
        },
        {
          "id": "o2",
          "text": "Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động."
        },
        {
          "id": "o3",
          "text": "Chuyển nhiệm vụ quân sự sang vận tải thuần túy của các đoàn chi viện."
        },
        {
          "id": "o4",
          "text": "Thay thế nhu cầu xây dựng lực lượng chính trị và tổ chức quần chúng."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Kiện toàn tổ chức tạo năng lực phối hợp; không chỉ tăng số lượng tên gọi hoặc xóa vai trò lực lượng khác.",
      "sourceRef": "D.5, tr.14"
    },
    {
      "id": "vnr-1-24",
      "difficulty": 1,
      "topic": "Ấp Bắc và đấu tranh tổng hợp",
      "familyId": "vnr-family-24",
      "format": "reasoning",
      "prompt": "Ý nghĩa nào của chiến thắng Ấp Bắc cần đặt trong quan hệ phong trào chung?",
      "options": [
        {
          "id": "o1",
          "text": "Củng cố khả năng và tinh thần chống càn, hỗ trợ phong trào quần chúng và phá ấp chiến lược."
        },
        {
          "id": "o2",
          "text": "Hoàn thành đánh bại mọi chiến lược chiến tranh của Mỹ ngay năm1963."
        },
        {
          "id": "o3",
          "text": "Chứng minh đấu tranh chính trị từ đó không còn tác động thực tế."
        },
        {
          "id": "o4",
          "text": "Làm miền Nam không còn cần tiếp nhận nguồn lực từ hậu phương."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược.",
      "sourceRef": "D.6, tr.14–15"
    },
    {
      "id": "vnr-1-25",
      "difficulty": 1,
      "topic": "Đánh giá giới hạn thắng lợi",
      "familyId": "vnr-family-25",
      "format": "reasoning",
      "prompt": "Đánh giá nào đúng giới hạn lịch sử của thắng lợi đánh bại Chiến tranh đặc biệt?",
      "options": [
        {
          "id": "o1",
          "text": "Đồng nghĩa hoàn thành mọi nhiệm vụ thống nhất trong năm1965."
        },
        {
          "id": "o2",
          "text": "Chỉ là biến đổi tên gọi chiến tranh, không có ý nghĩa về thế và lực."
        },
        {
          "id": "o3",
          "text": "Cho thấy miền Bắc đã hoàn tất mọi chặng xây dựng chủ nghĩa xã hội."
        },
        {
          "id": "o4",
          "text": "Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Phải phân biệt kết quả giai đoạn với thắng lợi cuối cùng và ghi nhận cả thành tựu, hạn chế.",
      "sourceRef": "E.1–E.3, tr.15–16"
    },
    {
      "id": "vnr-2-01",
      "difficulty": 2,
      "topic": "Hai nhiệm vụ chiến lược",
      "familyId": "vnr-family-01",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước. (II) Tự nguyện, cùng có lợi và quản lý dân chủ. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o4",
          "text": "(I) đúng, (II) sai."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(I) đúng: Sự thống nhất mục tiêu không xóa khác biệt điều kiện và nhiệm vụ của mỗi miền. (II) đúng: Không thay cùng có lợi bằng bình quân hoặc thay dân chủ bằng quyết định đơn phương.",
      "sourceRef": "A.1–A.3, tr.3–5; C.1, tr.9; B.3, tr.7"
    },
    {
      "id": "vnr-2-02",
      "difficulty": 2,
      "topic": "Độc lập tự chủ và quốc tế",
      "familyId": "vnr-family-02",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Từ chối hỗ trợ quốc tế để chứng minh khả năng tự chủ. (II) Dùng phát triển thị trường thay toàn bộ mục tiêu cải tạo sở hữu. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o3",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o4",
          "text": "(I) sai, (II) đúng."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "(I) sai: Tự chủ trong đường lối có thể đi cùng tranh thủ nguồn lực bên ngoài. (II) sai: Phải phân biệt hình thức cải tạo công thương nghiệp với tổ chức hợp tác hóa trong nông nghiệp.",
      "sourceRef": "A.2, tr.4; B.3, tr.7"
    },
    {
      "id": "vnr-2-03",
      "difficulty": 2,
      "topic": "Khôi phục nông nghiệp",
      "familyId": "vnr-family-03",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Nông nghiệp giữ vai trò chủ yếu, gắn trực tiếp lương thực, sinh kế và ổn định xã hội. (II) Từ bỏ mục tiêu thống nhất và chuyển sang xây dựng chủ nghĩa xã hội ở miền Nam. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o2",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o3",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) sai."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "(I) đúng: Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo. (II) sai: Đấu tranh chính trị gắn mục tiêu thống nhất với điều chỉnh tổ chức và bảo toàn lực lượng.",
      "sourceRef": "B.1, tr.5–6; B.4, tr.7–8"
    },
    {
      "id": "vnr-2-04",
      "difficulty": 2,
      "topic": "Tiếp quản và xây dựng",
      "familyId": "vnr-family-04",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Chứng minh cơ sở vật chất cho chủ nghĩa xã hội đã được xây dựng đầy đủ. (II) Kết hợp đấu tranh chính trị với đấu tranh vũ trang, phát huy sức mạnh quần chúng. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o2",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) đúng."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "(I) sai: Tiếp quản tạo điều kiện chính trị – quản lý, không đồng nghĩa hoàn thành mọi nhiệm vụ kinh tế hoặc thống nhất. (II) đúng: Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị.",
      "sourceRef": "B.1, tr.5–6; B.5, tr.8–9"
    },
    {
      "id": "vnr-2-05",
      "difficulty": 2,
      "topic": "Kết quả cải cách ruộng đất",
      "familyId": "vnr-family-05",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động. (II) Đưa cách mạng trở lại chủ yếu giữ gìn lực lượng, không phát triển đấu tranh. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o4",
          "text": "(I) đúng, (II) sai."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "(I) đúng: Thay đổi sở hữu là một kết quả cần phân biệt với hợp tác hóa, kỹ thuật sản xuất và chất lượng tổ chức thực hiện. (II) sai: Bước ngoặt về thế cách mạng cần phân biệt với thắng lợi cuối cùng.",
      "sourceRef": "B.2, tr.6; B.5, tr.8–9; E.2, tr.15"
    },
    {
      "id": "vnr-2-06",
      "difficulty": 2,
      "topic": "Sai lầm và sửa sai",
      "familyId": "vnr-family-06",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Thực hiện quản lý dân chủ hợp tác xã làm thay đổi mục tiêu cải cách. (II) Thay các tuyến vận tải trong việc trực tiếp chuyên chở vật chất từ miền Bắc. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o3",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o4",
          "text": "(I) sai, (II) đúng."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "(I) sai: Báo cáo liên hệ sai lầm với áp dụng giáo điều, cường điệu đấu tranh giai cấp và phân loại sai. (II) sai: Vai trò mặt trận là chính trị – đoàn kết rộng rãi; không đồng nhất với tuyến hậu cần hoặc chỉ huy quân sự.",
      "sourceRef": "B.2, tr.6; B.5, tr.9; D.5, tr.14"
    },
    {
      "id": "vnr-2-07",
      "difficulty": 2,
      "topic": "Cải tạo và phát triển",
      "familyId": "vnr-family-07",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất. (II) Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o2",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o3",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) sai."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "(I) đúng: Hai mặt có liên hệ, không được tách rời hoặc coi một mặt tự động thay thế mặt kia. (II) đúng: Hai nhiệm vụ khác tính chất nhưng đồng thời và cùng hướng mục tiêu chung.",
      "sourceRef": "B.3, tr.7; C.3, tr.10–11; C.1–C.2, tr.9–10"
    },
    {
      "id": "vnr-2-08",
      "difficulty": 2,
      "topic": "Nguyên tắc hợp tác xã",
      "familyId": "vnr-family-08",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Tham gia theo chỉ tiêu, cùng có lợi và quản lý dân chủ. (II) Vai trò quyết định nhất cho phép miền Bắc thay thế lực lượng cách mạng tại miền Nam. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o2",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) đúng."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(I) sai: Không thay cùng có lợi bằng bình quân hoặc thay dân chủ bằng quyết định đơn phương. (II) sai: Hai phạm vi quyết định khác nhau: nền tảng chiến lược toàn cục và đấu tranh trực tiếp giải phóng miền Nam.",
      "sourceRef": "B.3, tr.7; C.2, tr.10"
    },
    {
      "id": "vnr-2-09",
      "difficulty": 2,
      "topic": "Cải tạo công thương nghiệp",
      "familyId": "vnr-family-09",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất. (II) Chuẩn bị quốc phòng chứng tỏ đã từ bỏ phương hướng hòa bình. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o4",
          "text": "(I) đúng, (II) sai."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "(I) đúng: Phải phân biệt hình thức cải tạo công thương nghiệp với tổ chức hợp tác hóa trong nông nghiệp. (II) sai: Mục tiêu và việc chuẩn bị bảo vệ mục tiêu có thể bổ sung nhau, không tất yếu mâu thuẫn.",
      "sourceRef": "B.3, tr.7; C.1, tr.9–10"
    },
    {
      "id": "vnr-2-10",
      "difficulty": 2,
      "topic": "Miền Nam 1954–1958",
      "familyId": "vnr-family-10",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Từ bỏ mục tiêu thống nhất và chuyển sang xây dựng chủ nghĩa xã hội ở miền Nam. (II) Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o3",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o4",
          "text": "(I) sai, (II) đúng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "(I) sai: Đấu tranh chính trị gắn mục tiêu thống nhất với điều chỉnh tổ chức và bảo toàn lực lượng. (II) đúng: Ưu tiên không đồng nghĩa độc tôn một ngành hoặc bỏ phối hợp các mặt phát triển.",
      "sourceRef": "B.4, tr.7–8; C.3, tr.10–11"
    },
    {
      "id": "vnr-2-11",
      "difficulty": 2,
      "topic": "Nghị quyết Trung ương 15",
      "familyId": "vnr-family-11",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Kết hợp đấu tranh chính trị với đấu tranh vũ trang, phát huy sức mạnh quần chúng. (II) Chỉ cần thống kê phong trào thi đua, không cần xét tiềm lực và đời sống. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o2",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o3",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) sai."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "(I) đúng: Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị. (II) sai: Đánh giá kế hoạch phải gắn mục tiêu, kết quả và điều kiện lịch sử, tránh kết luận tuyệt đối.",
      "sourceRef": "B.5, tr.8–9; D.1, tr.11–12"
    },
    {
      "id": "vnr-2-12",
      "difficulty": 2,
      "topic": "Đồng khởi",
      "familyId": "vnr-family-12",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Đưa cách mạng trở lại chủ yếu giữ gìn lực lượng, không phát triển đấu tranh. (II) Chỉ mở đường vận tải là đủ, có thể bỏ khâu sản xuất và tổ chức tiếp nhận. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o2",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) đúng."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(I) sai: Bước ngoặt về thế cách mạng cần phân biệt với thắng lợi cuối cùng. (II) sai: Chi viện nối nhiều khâu và nhiều lực lượng, không phải một tuyến đường độc lập.",
      "sourceRef": "B.5, tr.8–9; E.2, tr.15; D.2, tr.12"
    },
    {
      "id": "vnr-2-13",
      "difficulty": 2,
      "topic": "Mặt trận giải phóng",
      "familyId": "vnr-family-13",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung. (II) Quân đội Sài Gòn chiến đấu chủ yếu, có cố vấn và phương tiện Mỹ cùng biện pháp kiểm soát dân cư. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o4",
          "text": "(I) đúng, (II) sai."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(I) đúng: Vai trò mặt trận là chính trị – đoàn kết rộng rãi; không đồng nhất với tuyến hậu cần hoặc chỉ huy quân sự. (II) đúng: Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược.",
      "sourceRef": "B.5, tr.9; D.5, tr.14; D.3, tr.12–13"
    },
    {
      "id": "vnr-2-14",
      "difficulty": 2,
      "topic": "Đại hội III và hai chiến lược",
      "familyId": "vnr-family-14",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Hoàn tất xã hội chủ nghĩa ở cả hai miền trước khi đấu tranh thống nhất. (II) Ba mũi là kinh tế, văn hóa, quân sự; ba vùng là hậu phương, tiền tuyến, quốc tế. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o3",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o4",
          "text": "(I) sai, (II) đúng."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "(I) sai: Hai nhiệm vụ khác tính chất nhưng đồng thời và cùng hướng mục tiêu chung. (II) sai: Không nhầm hình thức tiến công, loại địa bàn và phân chia địa lý toàn quốc.",
      "sourceRef": "C.1–C.2, tr.9–10; D.4, tr.13–14"
    },
    {
      "id": "vnr-2-15",
      "difficulty": 2,
      "topic": "Quyết định nhất và trực tiếp",
      "familyId": "vnr-family-15",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Miền Bắc quyết định nhất đối với cả nước; miền Nam quyết định trực tiếp đối với giải phóng miền Nam. (II) Phá xong một đồn là tự động kết thúc mọi hình thức kiểm soát nông thôn. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o2",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o3",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) sai."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "(I) đúng: Hai phạm vi quyết định khác nhau: nền tảng chiến lược toàn cục và đấu tranh trực tiếp giải phóng miền Nam. (II) sai: Hệ thống kiểm soát có nhiều mặt; ba mũi bổ sung nhau để tác động toàn diện.",
      "sourceRef": "C.2, tr.10; D.3–D.4, tr.12–14"
    },
    {
      "id": "vnr-2-16",
      "difficulty": 2,
      "topic": "Hòa bình và chuẩn bị",
      "familyId": "vnr-family-16",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Chuẩn bị quốc phòng chứng tỏ đã từ bỏ phương hướng hòa bình. (II) Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o2",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) đúng."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "(I) sai: Mục tiêu và việc chuẩn bị bảo vệ mục tiêu có thể bổ sung nhau, không tất yếu mâu thuẫn. (II) đúng: Kiện toàn tổ chức tạo năng lực phối hợp; không chỉ tăng số lượng tên gọi hoặc xóa vai trò lực lượng khác.",
      "sourceRef": "C.1, tr.9–10; D.5, tr.14"
    },
    {
      "id": "vnr-2-17",
      "difficulty": 2,
      "topic": "Công nghiệp hóa hợp lý",
      "familyId": "vnr-family-17",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội. (II) Làm miền Nam không còn cần tiếp nhận nguồn lực từ hậu phương. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o4",
          "text": "(I) đúng, (II) sai."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "(I) đúng: Ưu tiên không đồng nghĩa độc tôn một ngành hoặc bỏ phối hợp các mặt phát triển. (II) sai: Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược.",
      "sourceRef": "C.3, tr.10–11; D.6, tr.14–15"
    },
    {
      "id": "vnr-2-18",
      "difficulty": 2,
      "topic": "Kế hoạch1961–1965",
      "familyId": "vnr-family-18",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Chỉ cần thống kê phong trào thi đua, không cần xét tiềm lực và đời sống. (II) Đồng nghĩa hoàn thành mọi nhiệm vụ thống nhất trong năm1965. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o3",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o4",
          "text": "(I) sai, (II) đúng."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "(I) sai: Đánh giá kế hoạch phải gắn mục tiêu, kết quả và điều kiện lịch sử, tránh kết luận tuyệt đối. (II) sai: Phải phân biệt kết quả giai đoạn với thắng lợi cuối cùng và ghi nhận cả thành tựu, hạn chế.",
      "sourceRef": "D.1, tr.11–12; E.1–E.3, tr.15–16"
    },
    {
      "id": "vnr-2-19",
      "difficulty": 2,
      "topic": "Hệ thống chi viện",
      "familyId": "vnr-family-19",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Sản xuất, chuẩn bị nhân lực, hậu cần và vận tải phải phối hợp từ hậu phương tới chiến trường. (II) Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o2",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o3",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) sai."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "(I) đúng: Chi viện nối nhiều khâu và nhiều lực lượng, không phải một tuyến đường độc lập. (II) đúng: Sự thống nhất mục tiêu không xóa khác biệt điều kiện và nhiệm vụ của mỗi miền.",
      "sourceRef": "D.2, tr.12; A.1–A.3, tr.3–5; C.1, tr.9"
    },
    {
      "id": "vnr-2-20",
      "difficulty": 2,
      "topic": "Chiến tranh đặc biệt",
      "familyId": "vnr-family-20",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Mỹ chỉ hỗ trợ kinh tế, không tham gia cố vấn và phương tiện quân sự. (II) Điều chỉnh mục tiêu thống nhất theo yêu cầu của từng bên viện trợ. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o2",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) đúng."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(I) sai: Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược. (II) sai: Tự chủ trong đường lối có thể đi cùng tranh thủ nguồn lực bên ngoài.",
      "sourceRef": "D.3, tr.12–13; A.2, tr.4"
    },
    {
      "id": "vnr-2-21",
      "difficulty": 2,
      "topic": "Hai chân ba mũi ba vùng",
      "familyId": "vnr-family-21",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị. (II) Nông nghiệp phải thay thế mọi nhiệm vụ công nghiệp và giao thông trong suốt thời kỳ. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o4",
          "text": "(I) đúng, (II) sai."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "(I) đúng: Không nhầm hình thức tiến công, loại địa bàn và phân chia địa lý toàn quốc. (II) sai: Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo.",
      "sourceRef": "D.4, tr.13–14; B.1, tr.5–6"
    },
    {
      "id": "vnr-2-22",
      "difficulty": 2,
      "topic": "Phá ấp chiến lược",
      "familyId": "vnr-family-22",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Phá xong một đồn là tự động kết thúc mọi hình thức kiểm soát nông thôn. (II) Tạo điều kiện quản lý thống nhất, phục hồi sản xuất và các dịch vụ thiết yếu. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o3",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o4",
          "text": "(I) sai, (II) đúng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "(I) sai: Hệ thống kiểm soát có nhiều mặt; ba mũi bổ sung nhau để tác động toàn diện. (II) đúng: Tiếp quản tạo điều kiện chính trị – quản lý, không đồng nghĩa hoàn thành mọi nhiệm vụ kinh tế hoặc thống nhất.",
      "sourceRef": "D.3–D.4, tr.12–14; B.1, tr.5–6"
    },
    {
      "id": "vnr-2-23",
      "difficulty": 2,
      "topic": "Tổ chức lực lượng",
      "familyId": "vnr-family-23",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động. (II) Thay thế mọi nhu cầu về thủy lợi và tổ chức lao động trong sản xuất. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o2",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o3",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) sai."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "(I) đúng: Kiện toàn tổ chức tạo năng lực phối hợp; không chỉ tăng số lượng tên gọi hoặc xóa vai trò lực lượng khác. (II) sai: Thay đổi sở hữu là một kết quả cần phân biệt với hợp tác hóa, kỹ thuật sản xuất và chất lượng tổ chức thực hiện.",
      "sourceRef": "D.5, tr.14; B.2, tr.6"
    },
    {
      "id": "vnr-2-24",
      "difficulty": 2,
      "topic": "Ấp Bắc và đấu tranh tổng hợp",
      "familyId": "vnr-family-24",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Làm miền Nam không còn cần tiếp nhận nguồn lực từ hậu phương. (II) Coi trọng điều tra tình hình đến mức không còn tổ chức thực hiện. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) đúng, (II) sai."
        },
        {
          "id": "o2",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o4",
          "text": "Cả (I) và (II) đúng."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(I) sai: Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược. (II) sai: Báo cáo liên hệ sai lầm với áp dụng giáo điều, cường điệu đấu tranh giai cấp và phân loại sai.",
      "sourceRef": "D.6, tr.14–15; B.2, tr.6"
    },
    {
      "id": "vnr-2-25",
      "difficulty": 2,
      "topic": "Đánh giá giới hạn thắng lợi",
      "familyId": "vnr-family-25",
      "format": "paired-claims",
      "prompt": "Đánh giá hai nhận định trong giai đoạn1954–1965. (I) Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước. (II) Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất. Chọn kết luận đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(I) sai, (II) đúng."
        },
        {
          "id": "o2",
          "text": "Cả (I) và (II) sai."
        },
        {
          "id": "o3",
          "text": "Cả (I) và (II) đúng."
        },
        {
          "id": "o4",
          "text": "(I) đúng, (II) sai."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(I) đúng: Phải phân biệt kết quả giai đoạn với thắng lợi cuối cùng và ghi nhận cả thành tựu, hạn chế. (II) đúng: Hai mặt có liên hệ, không được tách rời hoặc coi một mặt tự động thay thế mặt kia.",
      "sourceRef": "E.1–E.3, tr.15–16; B.3, tr.7; C.3, tr.10–11"
    },
    {
      "id": "vnr-3-01",
      "difficulty": 3,
      "topic": "Hai nhiệm vụ chiến lược",
      "familyId": "vnr-family-01",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung hai nhiệm vụ chiến lược, tiếp quản và xây dựng, miền nam 1954–1958, công nghiệp hóa hợp lý. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội."
        },
        {
          "id": "o2",
          "text": "Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước."
        },
        {
          "id": "o3",
          "text": "Hoàn thành cả nhiệm vụ giải phóng miền Nam và thống nhất quốc gia."
        },
        {
          "id": "o4",
          "text": "Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tiếp quản tạo điều kiện chính trị – quản lý, không đồng nghĩa hoàn thành mọi nhiệm vụ kinh tế hoặc thống nhất.",
      "sourceRef": "A.1–A.3, tr.3–5; C.1, tr.9; B.1, tr.5–6; B.4, tr.7–8; C.3, tr.10–11"
    },
    {
      "id": "vnr-3-02",
      "difficulty": 3,
      "topic": "Độc lập tự chủ và quốc tế",
      "familyId": "vnr-family-02",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung độc lập tự chủ và quốc tế, kết quả cải cách ruộng đất, nghị quyết trung ương 15, kế hoạch1961–1965. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Giữ độc lập, tự chủ đồng thời tranh thủ sự ủng hộ quốc tế."
        },
        {
          "id": "o2",
          "text": "Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động."
        },
        {
          "id": "o3",
          "text": "Thay thế phong trào chính trị bằng hoạt động quân sự tách khỏi quần chúng."
        },
        {
          "id": "o4",
          "text": "Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị.",
      "sourceRef": "A.2, tr.4; B.2, tr.6; B.5, tr.8–9; D.1, tr.11–12"
    },
    {
      "id": "vnr-3-03",
      "difficulty": 3,
      "topic": "Khôi phục nông nghiệp",
      "familyId": "vnr-family-03",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung khôi phục nông nghiệp, sai lầm và sửa sai, đồng khởi, hệ thống chi viện. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Chủ quan, giáo điều và đánh giá không đầy đủ quan hệ xã hội thực tế."
        },
        {
          "id": "o2",
          "text": "Góp phần chuyển từ giữ gìn lực lượng sang thế tiến công và mở rộng quyền làm chủ."
        },
        {
          "id": "o3",
          "text": "Nguồn chi viện có thể thay toàn bộ lực lượng tại chỗ của miền Nam."
        },
        {
          "id": "o4",
          "text": "Nông nghiệp giữ vai trò chủ yếu, gắn trực tiếp lương thực, sinh kế và ổn định xã hội."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Chi viện nối nhiều khâu và nhiều lực lượng, không phải một tuyến đường độc lập.",
      "sourceRef": "B.1, tr.5–6; B.2, tr.6; B.5, tr.8–9; E.2, tr.15; D.2, tr.12"
    },
    {
      "id": "vnr-3-04",
      "difficulty": 3,
      "topic": "Tiếp quản và xây dựng",
      "familyId": "vnr-family-04",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung tiếp quản và xây dựng, cải tạo và phát triển, mặt trận giải phóng, chiến tranh đặc biệt. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung."
        },
        {
          "id": "o2",
          "text": "Quân đội Sài Gòn chiến đấu chủ yếu, có cố vấn và phương tiện Mỹ cùng biện pháp kiểm soát dân cư."
        },
        {
          "id": "o3",
          "text": "Hoàn thành cả nhiệm vụ giải phóng miền Nam và thống nhất quốc gia."
        },
        {
          "id": "o4",
          "text": "Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tiếp quản tạo điều kiện chính trị – quản lý, không đồng nghĩa hoàn thành mọi nhiệm vụ kinh tế hoặc thống nhất.",
      "sourceRef": "B.1, tr.5–6; B.3, tr.7; C.3, tr.10–11; B.5, tr.9; D.5, tr.14; D.3, tr.12–13"
    },
    {
      "id": "vnr-3-05",
      "difficulty": 3,
      "topic": "Kết quả cải cách ruộng đất",
      "familyId": "vnr-family-05",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung kết quả cải cách ruộng đất, nguyên tắc hợp tác xã, đại hội iii và hai chiến lược, hai chân ba mũi ba vùng. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị."
        },
        {
          "id": "o2",
          "text": "Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động."
        },
        {
          "id": "o3",
          "text": "Tự nguyện, phân phối bình quân và quản lý dân chủ."
        },
        {
          "id": "o4",
          "text": "Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Không thay cùng có lợi bằng bình quân hoặc thay dân chủ bằng quyết định đơn phương.",
      "sourceRef": "B.2, tr.6; B.3, tr.7; C.1–C.2, tr.9–10; D.4, tr.13–14"
    },
    {
      "id": "vnr-3-06",
      "difficulty": 3,
      "topic": "Sai lầm và sửa sai",
      "familyId": "vnr-family-06",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung sai lầm và sửa sai, cải tạo công thương nghiệp, quyết định nhất và trực tiếp, phá ấp chiến lược. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Chủ quan, giáo điều và đánh giá không đầy đủ quan hệ xã hội thực tế."
        },
        {
          "id": "o2",
          "text": "Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất."
        },
        {
          "id": "o3",
          "text": "Hai miền đều quyết định trực tiếp theo cùng một nghĩa nên không cần phân biệt."
        },
        {
          "id": "o4",
          "text": "Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Hai phạm vi quyết định khác nhau: nền tảng chiến lược toàn cục và đấu tranh trực tiếp giải phóng miền Nam.",
      "sourceRef": "B.2, tr.6; B.3, tr.7; C.2, tr.10; D.3–D.4, tr.12–14"
    },
    {
      "id": "vnr-3-07",
      "difficulty": 3,
      "topic": "Cải tạo và phát triển",
      "familyId": "vnr-family-07",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung cải tạo và phát triển, miền nam 1954–1958, hòa bình và chuẩn bị, tổ chức lực lượng. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới."
        },
        {
          "id": "o2",
          "text": "Mục tiêu hòa bình cần được bảo vệ bằng cảnh giác và chuẩn bị trước nguy cơ thực tế."
        },
        {
          "id": "o3",
          "text": "Tách hoạt động vũ trang khỏi mục tiêu và chỉ đạo cách mạng chung."
        },
        {
          "id": "o4",
          "text": "Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Kiện toàn tổ chức tạo năng lực phối hợp; không chỉ tăng số lượng tên gọi hoặc xóa vai trò lực lượng khác.",
      "sourceRef": "B.3, tr.7; C.3, tr.10–11; B.4, tr.7–8; C.1, tr.9–10; D.5, tr.14"
    },
    {
      "id": "vnr-3-08",
      "difficulty": 3,
      "topic": "Nguyên tắc hợp tác xã",
      "familyId": "vnr-family-08",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung nguyên tắc hợp tác xã, nghị quyết trung ương 15, công nghiệp hóa hợp lý, ấp bắc và đấu tranh tổng hợp. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội."
        },
        {
          "id": "o2",
          "text": "Củng cố khả năng và tinh thần chống càn, hỗ trợ phong trào quần chúng và phá ấp chiến lược."
        },
        {
          "id": "o3",
          "text": "Tự nguyện, phân phối bình quân và quản lý dân chủ."
        },
        {
          "id": "o4",
          "text": "Kết hợp đấu tranh chính trị với đấu tranh vũ trang, phát huy sức mạnh quần chúng."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Không thay cùng có lợi bằng bình quân hoặc thay dân chủ bằng quyết định đơn phương.",
      "sourceRef": "B.3, tr.7; B.5, tr.8–9; C.3, tr.10–11; D.6, tr.14–15"
    },
    {
      "id": "vnr-3-09",
      "difficulty": 3,
      "topic": "Cải tạo công thương nghiệp",
      "familyId": "vnr-family-09",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung cải tạo công thương nghiệp, đồng khởi, kế hoạch1961–1965, đánh giá giới hạn thắng lợi. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước."
        },
        {
          "id": "o2",
          "text": "Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất."
        },
        {
          "id": "o3",
          "text": "Thay thế vai trò tổ chức chính trị bằng quân đội từ miền Bắc."
        },
        {
          "id": "o4",
          "text": "Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Bước ngoặt về thế cách mạng cần phân biệt với thắng lợi cuối cùng.",
      "sourceRef": "B.3, tr.7; B.5, tr.8–9; E.2, tr.15; D.1, tr.11–12; E.1–E.3, tr.15–16"
    },
    {
      "id": "vnr-3-10",
      "difficulty": 3,
      "topic": "Miền Nam 1954–1958",
      "familyId": "vnr-family-10",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung miền nam 1954–1958, mặt trận giải phóng, hệ thống chi viện, hai nhiệm vụ chiến lược. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới."
        },
        {
          "id": "o2",
          "text": "Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung."
        },
        {
          "id": "o3",
          "text": "Chi viện là hoạt động riêng không liên hệ mục tiêu phát triển miền Bắc."
        },
        {
          "id": "o4",
          "text": "Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Chi viện nối nhiều khâu và nhiều lực lượng, không phải một tuyến đường độc lập.",
      "sourceRef": "B.4, tr.7–8; B.5, tr.9; D.5, tr.14; D.2, tr.12; A.1–A.3, tr.3–5; C.1, tr.9"
    },
    {
      "id": "vnr-3-11",
      "difficulty": 3,
      "topic": "Nghị quyết Trung ương 15",
      "familyId": "vnr-family-11",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung nghị quyết trung ương 15, đại hội iii và hai chiến lược, chiến tranh đặc biệt, độc lập tự chủ và quốc tế. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam."
        },
        {
          "id": "o2",
          "text": "Quân đội Sài Gòn chiến đấu chủ yếu, có cố vấn và phương tiện Mỹ cùng biện pháp kiểm soát dân cư."
        },
        {
          "id": "o3",
          "text": "Lựa chọn một nước làm bên quyết định đường lối để bảo đảm viện trợ."
        },
        {
          "id": "o4",
          "text": "Kết hợp đấu tranh chính trị với đấu tranh vũ trang, phát huy sức mạnh quần chúng."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tự chủ trong đường lối có thể đi cùng tranh thủ nguồn lực bên ngoài.",
      "sourceRef": "B.5, tr.8–9; C.1–C.2, tr.9–10; D.3, tr.12–13; A.2, tr.4"
    },
    {
      "id": "vnr-3-12",
      "difficulty": 3,
      "topic": "Đồng khởi",
      "familyId": "vnr-family-12",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung đồng khởi, quyết định nhất và trực tiếp, hai chân ba mũi ba vùng, khôi phục nông nghiệp. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị."
        },
        {
          "id": "o2",
          "text": "Nông nghiệp giữ vai trò chủ yếu, gắn trực tiếp lương thực, sinh kế và ổn định xã hội."
        },
        {
          "id": "o3",
          "text": "Thay thế vai trò tổ chức chính trị bằng quân đội từ miền Bắc."
        },
        {
          "id": "o4",
          "text": "Miền Bắc quyết định nhất đối với cả nước; miền Nam quyết định trực tiếp đối với giải phóng miền Nam."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Bước ngoặt về thế cách mạng cần phân biệt với thắng lợi cuối cùng.",
      "sourceRef": "B.5, tr.8–9; E.2, tr.15; C.2, tr.10; D.4, tr.13–14; B.1, tr.5–6"
    },
    {
      "id": "vnr-3-13",
      "difficulty": 3,
      "topic": "Mặt trận giải phóng",
      "familyId": "vnr-family-13",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung mặt trận giải phóng, hòa bình và chuẩn bị, phá ấp chiến lược, tiếp quản và xây dựng. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Tạo điều kiện quản lý thống nhất, phục hồi sản xuất và các dịch vụ thiết yếu."
        },
        {
          "id": "o2",
          "text": "Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung."
        },
        {
          "id": "o3",
          "text": "Hai yêu cầu thuộc hai miền nên không có quan hệ trong đường lối chung."
        },
        {
          "id": "o4",
          "text": "Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Mục tiêu và việc chuẩn bị bảo vệ mục tiêu có thể bổ sung nhau, không tất yếu mâu thuẫn.",
      "sourceRef": "B.5, tr.9; D.5, tr.14; C.1, tr.9–10; D.3–D.4, tr.12–14; B.1, tr.5–6"
    },
    {
      "id": "vnr-3-14",
      "difficulty": 3,
      "topic": "Đại hội III và hai chiến lược",
      "familyId": "vnr-family-14",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung đại hội iii và hai chiến lược, công nghiệp hóa hợp lý, tổ chức lực lượng, kết quả cải cách ruộng đất. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam."
        },
        {
          "id": "o2",
          "text": "Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội."
        },
        {
          "id": "o3",
          "text": "Chuyển nhiệm vụ quân sự sang vận tải thuần túy của các đoàn chi viện."
        },
        {
          "id": "o4",
          "text": "Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Kiện toàn tổ chức tạo năng lực phối hợp; không chỉ tăng số lượng tên gọi hoặc xóa vai trò lực lượng khác.",
      "sourceRef": "C.1–C.2, tr.9–10; C.3, tr.10–11; D.5, tr.14; B.2, tr.6"
    },
    {
      "id": "vnr-3-15",
      "difficulty": 3,
      "topic": "Quyết định nhất và trực tiếp",
      "familyId": "vnr-family-15",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung quyết định nhất và trực tiếp, kế hoạch1961–1965, ấp bắc và đấu tranh tổng hợp, sai lầm và sửa sai. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả."
        },
        {
          "id": "o2",
          "text": "Củng cố khả năng và tinh thần chống càn, hỗ trợ phong trào quần chúng và phá ấp chiến lược."
        },
        {
          "id": "o3",
          "text": "Từ bỏ đấu tranh giai cấp và chỉ dựa vào thỏa thuận với địa chủ."
        },
        {
          "id": "o4",
          "text": "Miền Bắc quyết định nhất đối với cả nước; miền Nam quyết định trực tiếp đối với giải phóng miền Nam."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Báo cáo liên hệ sai lầm với áp dụng giáo điều, cường điệu đấu tranh giai cấp và phân loại sai.",
      "sourceRef": "C.2, tr.10; D.1, tr.11–12; D.6, tr.14–15; B.2, tr.6"
    },
    {
      "id": "vnr-3-16",
      "difficulty": 3,
      "topic": "Hòa bình và chuẩn bị",
      "familyId": "vnr-family-16",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung hòa bình và chuẩn bị, hệ thống chi viện, đánh giá giới hạn thắng lợi, cải tạo và phát triển. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước."
        },
        {
          "id": "o2",
          "text": "Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất."
        },
        {
          "id": "o3",
          "text": "Hai yêu cầu thuộc hai miền nên không có quan hệ trong đường lối chung."
        },
        {
          "id": "o4",
          "text": "Sản xuất, chuẩn bị nhân lực, hậu cần và vận tải phải phối hợp từ hậu phương tới chiến trường."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Mục tiêu và việc chuẩn bị bảo vệ mục tiêu có thể bổ sung nhau, không tất yếu mâu thuẫn.",
      "sourceRef": "C.1, tr.9–10; D.2, tr.12; E.1–E.3, tr.15–16; B.3, tr.7; C.3, tr.10–11"
    },
    {
      "id": "vnr-3-17",
      "difficulty": 3,
      "topic": "Công nghiệp hóa hợp lý",
      "familyId": "vnr-family-17",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung công nghiệp hóa hợp lý, chiến tranh đặc biệt, hai nhiệm vụ chiến lược, nguyên tắc hợp tác xã. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Tự nguyện, cùng có lợi và quản lý dân chủ."
        },
        {
          "id": "o2",
          "text": "Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội."
        },
        {
          "id": "o3",
          "text": "Quân viễn chinh Mỹ chiến đấu chủ yếu và không cần quân đội Sài Gòn."
        },
        {
          "id": "o4",
          "text": "Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược.",
      "sourceRef": "C.3, tr.10–11; D.3, tr.12–13; A.1–A.3, tr.3–5; C.1, tr.9; B.3, tr.7"
    },
    {
      "id": "vnr-3-18",
      "difficulty": 3,
      "topic": "Kế hoạch1961–1965",
      "familyId": "vnr-family-18",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung kế hoạch1961–1965, hai chân ba mũi ba vùng, độc lập tự chủ và quốc tế, cải tạo công thương nghiệp. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả."
        },
        {
          "id": "o2",
          "text": "Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị."
        },
        {
          "id": "o3",
          "text": "Từ chối hỗ trợ quốc tế để chứng minh khả năng tự chủ."
        },
        {
          "id": "o4",
          "text": "Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tự chủ trong đường lối có thể đi cùng tranh thủ nguồn lực bên ngoài.",
      "sourceRef": "D.1, tr.11–12; D.4, tr.13–14; A.2, tr.4; B.3, tr.7"
    },
    {
      "id": "vnr-3-19",
      "difficulty": 3,
      "topic": "Hệ thống chi viện",
      "familyId": "vnr-family-19",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung hệ thống chi viện, phá ấp chiến lược, khôi phục nông nghiệp, miền nam 1954–1958. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận."
        },
        {
          "id": "o2",
          "text": "Nông nghiệp giữ vai trò chủ yếu, gắn trực tiếp lương thực, sinh kế và ổn định xã hội."
        },
        {
          "id": "o3",
          "text": "Chấm dứt hoạt động trong dân để chỉ dựa vào thương lượng quốc tế."
        },
        {
          "id": "o4",
          "text": "Sản xuất, chuẩn bị nhân lực, hậu cần và vận tải phải phối hợp từ hậu phương tới chiến trường."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Đấu tranh chính trị gắn mục tiêu thống nhất với điều chỉnh tổ chức và bảo toàn lực lượng.",
      "sourceRef": "D.2, tr.12; D.3–D.4, tr.12–14; B.1, tr.5–6; B.4, tr.7–8"
    },
    {
      "id": "vnr-3-20",
      "difficulty": 3,
      "topic": "Chiến tranh đặc biệt",
      "familyId": "vnr-family-20",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung chiến tranh đặc biệt, tổ chức lực lượng, tiếp quản và xây dựng, nghị quyết trung ương 15. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Tạo điều kiện quản lý thống nhất, phục hồi sản xuất và các dịch vụ thiết yếu."
        },
        {
          "id": "o2",
          "text": "Kết hợp đấu tranh chính trị với đấu tranh vũ trang, phát huy sức mạnh quần chúng."
        },
        {
          "id": "o3",
          "text": "Quân viễn chinh Mỹ chiến đấu chủ yếu và không cần quân đội Sài Gòn."
        },
        {
          "id": "o4",
          "text": "Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược.",
      "sourceRef": "D.3, tr.12–13; D.5, tr.14; B.1, tr.5–6; B.5, tr.8–9"
    },
    {
      "id": "vnr-3-21",
      "difficulty": 3,
      "topic": "Hai chân ba mũi ba vùng",
      "familyId": "vnr-family-21",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung hai chân ba mũi ba vùng, ấp bắc và đấu tranh tổng hợp, kết quả cải cách ruộng đất, đồng khởi. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Góp phần chuyển từ giữ gìn lực lượng sang thế tiến công và mở rộng quyền làm chủ."
        },
        {
          "id": "o2",
          "text": "Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị."
        },
        {
          "id": "o3",
          "text": "Chứng minh đấu tranh chính trị từ đó không còn tác động thực tế."
        },
        {
          "id": "o4",
          "text": "Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược.",
      "sourceRef": "D.4, tr.13–14; D.6, tr.14–15; B.2, tr.6; B.5, tr.8–9; E.2, tr.15"
    },
    {
      "id": "vnr-3-22",
      "difficulty": 3,
      "topic": "Phá ấp chiến lược",
      "familyId": "vnr-family-22",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung phá ấp chiến lược, đánh giá giới hạn thắng lợi, sai lầm và sửa sai, mặt trận giải phóng. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận."
        },
        {
          "id": "o2",
          "text": "Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước."
        },
        {
          "id": "o3",
          "text": "Thực hiện quản lý dân chủ hợp tác xã làm thay đổi mục tiêu cải cách."
        },
        {
          "id": "o4",
          "text": "Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Báo cáo liên hệ sai lầm với áp dụng giáo điều, cường điệu đấu tranh giai cấp và phân loại sai.",
      "sourceRef": "D.3–D.4, tr.12–14; E.1–E.3, tr.15–16; B.2, tr.6; B.5, tr.9; D.5, tr.14"
    },
    {
      "id": "vnr-3-23",
      "difficulty": 3,
      "topic": "Tổ chức lực lượng",
      "familyId": "vnr-family-23",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung tổ chức lực lượng, hai nhiệm vụ chiến lược, cải tạo và phát triển, đại hội iii và hai chiến lược. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước."
        },
        {
          "id": "o2",
          "text": "Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất."
        },
        {
          "id": "o3",
          "text": "Cách mạng dân tộc dân chủ ở miền Bắc và xã hội chủ nghĩa ở miền Nam."
        },
        {
          "id": "o4",
          "text": "Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Hai nhiệm vụ khác tính chất nhưng đồng thời và cùng hướng mục tiêu chung.",
      "sourceRef": "D.5, tr.14; A.1–A.3, tr.3–5; C.1, tr.9; B.3, tr.7; C.3, tr.10–11; C.1–C.2, tr.9–10"
    },
    {
      "id": "vnr-3-24",
      "difficulty": 3,
      "topic": "Ấp Bắc và đấu tranh tổng hợp",
      "familyId": "vnr-family-24",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung ấp bắc và đấu tranh tổng hợp, độc lập tự chủ và quốc tế, nguyên tắc hợp tác xã, quyết định nhất và trực tiếp. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Tự nguyện, cùng có lợi và quản lý dân chủ."
        },
        {
          "id": "o2",
          "text": "Miền Bắc quyết định nhất đối với cả nước; miền Nam quyết định trực tiếp đối với giải phóng miền Nam."
        },
        {
          "id": "o3",
          "text": "Chứng minh đấu tranh chính trị từ đó không còn tác động thực tế."
        },
        {
          "id": "o4",
          "text": "Giữ độc lập, tự chủ đồng thời tranh thủ sự ủng hộ quốc tế."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược.",
      "sourceRef": "D.6, tr.14–15; A.2, tr.4; B.3, tr.7; C.2, tr.10"
    },
    {
      "id": "vnr-3-25",
      "difficulty": 3,
      "topic": "Đánh giá giới hạn thắng lợi",
      "familyId": "vnr-family-25",
      "format": "error-diagnosis",
      "prompt": "Xét các nội dung đánh giá giới hạn thắng lợi, khôi phục nông nghiệp, cải tạo công thương nghiệp, hòa bình và chuẩn bị. Nhận định nào sau đây cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Mục tiêu hòa bình cần được bảo vệ bằng cảnh giác và chuẩn bị trước nguy cơ thực tế."
        },
        {
          "id": "o2",
          "text": "Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước."
        },
        {
          "id": "o3",
          "text": "Ưu tiên nông nghiệp có nghĩa chưa cần củng cố chính quyền và an ninh."
        },
        {
          "id": "o4",
          "text": "Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo.",
      "sourceRef": "E.1–E.3, tr.15–16; B.1, tr.5–6; B.3, tr.7; C.1, tr.9–10"
    },
    {
      "id": "vnr-4-01",
      "difficulty": 4,
      "topic": "Hai nhiệm vụ chiến lược",
      "familyId": "vnr-family-01",
      "format": "case-analysis",
      "prompt": "Một đề xuất muốn áp dụng nguyên xi nhiệm vụ xây dựng miền Bắc cho miền Nam sau Giơnevơ. Phản biện nào đúng trọng tâm?",
      "options": [
        {
          "id": "o1",
          "text": "Phải phân biệt điều kiện mỗi miền và phối hợp nhiệm vụ riêng trong mục tiêu chung."
        },
        {
          "id": "o2",
          "text": "Chỉ cần sửa tên địa phương vì nhiệm vụ hai miền thực chất giống nhau."
        },
        {
          "id": "o3",
          "text": "Cần tách hẳn mục tiêu thống nhất để mỗi miền chọn mục tiêu riêng."
        },
        {
          "id": "o4",
          "text": "Phải đợi miền Bắc hoàn thành xây dựng rồi mới xác định nhiệm vụ miền Nam."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Sự thống nhất mục tiêu không xóa khác biệt điều kiện và nhiệm vụ của mỗi miền.",
      "sourceRef": "A.1–A.3, tr.3–5; C.1, tr.9"
    },
    {
      "id": "vnr-4-02",
      "difficulty": 4,
      "topic": "Độc lập tự chủ và quốc tế",
      "familyId": "vnr-family-02",
      "format": "case-analysis",
      "prompt": "Một lập luận cho rằng nhận hỗ trợ quốc tế tất yếu làm mất độc lập đường lối. Cách đánh giá nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Đúng vì tự chủ đòi hỏi không có quan hệ hỗ trợ từ bên ngoài."
        },
        {
          "id": "o2",
          "text": "Sai vì nước viện trợ có quyền xác định nhiệm vụ cách mạng thay Việt Nam."
        },
        {
          "id": "o3",
          "text": "Đúng nhưng chỉ áp dụng với viện trợ kinh tế, không áp dụng viện trợ chính trị."
        },
        {
          "id": "o4",
          "text": "Cần phân biệt tranh thủ hỗ trợ với phụ thuộc vào quyết định của bên hỗ trợ."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Tự chủ trong đường lối có thể đi cùng tranh thủ nguồn lực bên ngoài.",
      "sourceRef": "A.2, tr.4"
    },
    {
      "id": "vnr-4-03",
      "difficulty": 4,
      "topic": "Khôi phục nông nghiệp",
      "familyId": "vnr-family-03",
      "format": "case-analysis",
      "prompt": "Một kế hoạch dành nguồn lực cho công nghiệp nặng nhưng hoãn khôi phục lương thực sau chiến tranh. Thiếu sót chính là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Chưa coi xuất khẩu công nghiệp là nhu cầu sinh tồn trực tiếp của đa số dân cư."
        },
        {
          "id": "o2",
          "text": "Chưa đình chỉ các hoạt động văn hóa để tập trung thuần túy vào sản xuất."
        },
        {
          "id": "o3",
          "text": "Bỏ qua nền tảng sinh kế và ổn định xã hội cần cho các nhiệm vụ phát triển dài hạn."
        },
        {
          "id": "o4",
          "text": "Chưa hoàn tất hợp tác hóa trước khi cho nông dân phục hồi sản xuất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo.",
      "sourceRef": "B.1, tr.5–6"
    },
    {
      "id": "vnr-4-04",
      "difficulty": 4,
      "topic": "Tiếp quản và xây dựng",
      "familyId": "vnr-family-04",
      "format": "case-analysis",
      "prompt": "Một nhận định coi việc quân Pháp rút khỏi miền Bắc là bằng chứng nền kinh tế đã sẵn sàng hiện đại hóa ngay. Lỗi chính là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Đã đánh giá quá cao vai trò phục hồi sản xuất trong ổn định đời sống."
        },
        {
          "id": "o2",
          "text": "Đánh đồng điều kiện giải phóng, tiếp quản với trình độ cơ sở vật chất và sản xuất."
        },
        {
          "id": "o3",
          "text": "Chưa coi việc tiếp quản là hoạt động thuần văn hóa."
        },
        {
          "id": "o4",
          "text": "Chưa yêu cầu miền Nam hoàn thành hợp tác hóa cùng thời điểm."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Tiếp quản tạo điều kiện chính trị – quản lý, không đồng nghĩa hoàn thành mọi nhiệm vụ kinh tế hoặc thống nhất.",
      "sourceRef": "B.1, tr.5–6"
    },
    {
      "id": "vnr-4-05",
      "difficulty": 4,
      "topic": "Kết quả cải cách ruộng đất",
      "familyId": "vnr-family-05",
      "format": "case-analysis",
      "prompt": "Một nhóm coi cải cách ruộng đất và hợp tác hóa là cùng một việc vì đều liên quan nông nghiệp. Cần phân biệt điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Phân phối lại ruộng đất và tổ chức sản xuất tập thể có nội dung, bước đi khác nhau."
        },
        {
          "id": "o2",
          "text": "Hai việc chỉ khác tên, không có khác biệt về quan hệ sở hữu và tổ chức."
        },
        {
          "id": "o3",
          "text": "Hợp tác hóa là chuyển từ nông nghiệp sang công nghiệp nên không liên quan nông dân."
        },
        {
          "id": "o4",
          "text": "Cải cách ruộng đất chỉ là đầu tư thủy lợi, còn hợp tác hóa mới liên quan sở hữu."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Thay đổi sở hữu là một kết quả cần phân biệt với hợp tác hóa, kỹ thuật sản xuất và chất lượng tổ chức thực hiện.",
      "sourceRef": "B.2, tr.6"
    },
    {
      "id": "vnr-4-06",
      "difficulty": 4,
      "topic": "Sai lầm và sửa sai",
      "familyId": "vnr-family-06",
      "format": "case-analysis",
      "prompt": "Sửa sai cần khẩn trương nhưng thận trọng vì yêu cầu nào?",
      "options": [
        {
          "id": "o1",
          "text": "Giữ nguyên mọi quyết định cũ để ưu tiên hình thức ổn định tổ chức."
        },
        {
          "id": "o2",
          "text": "Hủy đồng loạt mọi kết quả phân phối mà không thẩm tra từng trường hợp."
        },
        {
          "id": "o3",
          "text": "Đợi hoàn thành mọi nhiệm vụ dài hạn rồi mới xem xét quyền lợi bị ảnh hưởng."
        },
        {
          "id": "o4",
          "text": "Kịp thời khắc phục oan sai và phục hồi lòng tin, đồng thời tránh phát sinh sai lầm mới."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Báo cáo liên hệ sai lầm với áp dụng giáo điều, cường điệu đấu tranh giai cấp và phân loại sai.",
      "sourceRef": "B.2, tr.6"
    },
    {
      "id": "vnr-4-07",
      "difficulty": 4,
      "topic": "Cải tạo và phát triển",
      "familyId": "vnr-family-07",
      "format": "case-analysis",
      "prompt": "Một hợp tác xã đổi tên và cơ cấu sở hữu nhưng không cải thiện thủy lợi, kỹ năng, tổ chức lao động. Nhận xét nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "Không cần đầu tư kỹ thuật vì quan hệ sở hữu mới đã thay nhiệm vụ đó."
        },
        {
          "id": "o2",
          "text": "Muốn sản xuất phát triển phải quay về mọi hình thức tổ chức trước cải tạo."
        },
        {
          "id": "o3",
          "text": "Thay đổi tổ chức chưa đủ; phải phát triển điều kiện và năng lực sản xuất tương ứng."
        },
        {
          "id": "o4",
          "text": "Chỉ cần tăng quy mô xã viên là chắc chắn tăng năng suất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Hai mặt có liên hệ, không được tách rời hoặc coi một mặt tự động thay thế mặt kia.",
      "sourceRef": "B.3, tr.7; C.3, tr.10–11"
    },
    {
      "id": "vnr-4-08",
      "difficulty": 4,
      "topic": "Nguyên tắc hợp tác xã",
      "familyId": "vnr-family-08",
      "format": "case-analysis",
      "prompt": "Địa phương muốn tăng nhanh số hợp tác xã nên ép nông dân tham gia dù vẫn tổ chức biểu quyết nội bộ. Đánh giá nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "Tự nguyện chỉ cần áp dụng khi phân phối sản phẩm, không cần khi gia nhập."
        },
        {
          "id": "o2",
          "text": "Vi phạm tự nguyện; một số yếu tố dân chủ không bù được việc cưỡng ép tham gia."
        },
        {
          "id": "o3",
          "text": "Đáp ứng đủ nguyên tắc vì đã có biểu quyết sau khi vào hợp tác xã."
        },
        {
          "id": "o4",
          "text": "Chỉ cần quy mô lớn là bảo đảm cùng có lợi và tự nguyện."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Không thay cùng có lợi bằng bình quân hoặc thay dân chủ bằng quyết định đơn phương.",
      "sourceRef": "B.3, tr.7"
    },
    {
      "id": "vnr-4-09",
      "difficulty": 4,
      "topic": "Cải tạo công thương nghiệp",
      "familyId": "vnr-family-09",
      "format": "case-analysis",
      "prompt": "Một báo cáo dùng mô hình tổ đổi công để giải thích toàn bộ cải tạo công thương nghiệp. Thiếu sót nào cần sửa?",
      "options": [
        {
          "id": "o1",
          "text": "Đã lẫn hình thức tổ chức nông nghiệp với các hình thức cải tạo công thương nghiệp cụ thể."
        },
        {
          "id": "o2",
          "text": "Chưa coi công tư hợp doanh là phong trào đấu tranh vũ trang."
        },
        {
          "id": "o3",
          "text": "Chưa xóa mọi điểm khác biệt giữa công nghiệp và nông nghiệp."
        },
        {
          "id": "o4",
          "text": "Đã đánh giá quá cao việc bố trí lao động trong quá trình chuyển đổi."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Phải phân biệt hình thức cải tạo công thương nghiệp với tổ chức hợp tác hóa trong nông nghiệp.",
      "sourceRef": "B.3, tr.7"
    },
    {
      "id": "vnr-4-10",
      "difficulty": 4,
      "topic": "Miền Nam 1954–1958",
      "familyId": "vnr-family-10",
      "format": "case-analysis",
      "prompt": "Một cán bộ muốn bảo toàn lực lượng bằng cách rút hết cơ sở khỏi dân và ngừng hoạt động tại địa bàn. Phản biện nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Cần công khai toàn bộ danh sách cơ sở để được bảo vệ về pháp lý."
        },
        {
          "id": "o2",
          "text": "Cần chỉ giữ vũ khí, không cần cơ sở quần chúng."
        },
        {
          "id": "o3",
          "text": "Cần chuyển ngay toàn miền sang tác chiến chính quy, bỏ nhiệm vụ chính trị."
        },
        {
          "id": "o4",
          "text": "Giữ gìn lực lượng cần kết hợp bí mật tổ chức với bám dân và đấu tranh chính trị thích hợp."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Đấu tranh chính trị gắn mục tiêu thống nhất với điều chỉnh tổ chức và bảo toàn lực lượng.",
      "sourceRef": "B.4, tr.7–8"
    },
    {
      "id": "vnr-4-11",
      "difficulty": 4,
      "topic": "Nghị quyết Trung ương 15",
      "familyId": "vnr-family-11",
      "format": "case-analysis",
      "prompt": "Có ý kiến: Nghị quyết 15 chỉ cho phép đổi từ chính trị sang quân sự. Cần sửa thế nào?",
      "options": [
        {
          "id": "o1",
          "text": "Chỉ cần bỏ phần quần chúng để tránh nhầm với chính trị."
        },
        {
          "id": "o2",
          "text": "Cần coi vũ trang chỉ là vận tải hậu cần, không liên quan giành chính quyền."
        },
        {
          "id": "o3",
          "text": "Nhấn mạnh sự kết hợp lực lượng và hình thức, không hiểu quân sự là thay thế hoàn toàn chính trị."
        },
        {
          "id": "o4",
          "text": "Chỉ cần đổi tên thành đấu tranh quân sự chính quy là đủ."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị.",
      "sourceRef": "B.5, tr.8–9"
    },
    {
      "id": "vnr-4-12",
      "difficulty": 4,
      "topic": "Đồng khởi",
      "familyId": "vnr-family-12",
      "format": "case-analysis",
      "prompt": "Một nhóm coi Đồng khởi chỉ là một cuộc giao chiến quân sự riêng lẻ. Điểm nào bị bỏ qua?",
      "options": [
        {
          "id": "o1",
          "text": "Việc hoạt động chính trị không còn cần sau khi có lực lượng vũ trang."
        },
        {
          "id": "o2",
          "text": "Vai trò nổi dậy quần chúng, thay đổi quyền làm chủ và bước chuyển thế cách mạng."
        },
        {
          "id": "o3",
          "text": "Việc phong trào đã kết thúc hoàn toàn chiến tranh năm1960."
        },
        {
          "id": "o4",
          "text": "Việc miền Bắc từ bỏ xây dựng kinh tế để nhập toàn bộ lực lượng vào Nam."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Bước ngoặt về thế cách mạng cần phân biệt với thắng lợi cuối cùng.",
      "sourceRef": "B.5, tr.8–9; E.2, tr.15"
    },
    {
      "id": "vnr-4-13",
      "difficulty": 4,
      "topic": "Mặt trận giải phóng",
      "familyId": "vnr-family-13",
      "format": "case-analysis",
      "prompt": "Để chứng minh mở rộng lực lượng chính trị năm1960, nên dùng sự kiện nào trực tiếp nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Thành lập Mặt trận Dân tộc giải phóng miền Nam Việt Nam."
        },
        {
          "id": "o2",
          "text": "Thành lập Đoàn759 làm nhiệm vụ vận tải đường biển."
        },
        {
          "id": "o3",
          "text": "Chiến thắng Ấp Bắc trong chống càn bằng phương tiện hiện đại."
        },
        {
          "id": "o4",
          "text": "Phát động thi đua với Nhà máy cơ khí Duyên Hải ở miền Bắc."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Vai trò mặt trận là chính trị – đoàn kết rộng rãi; không đồng nhất với tuyến hậu cần hoặc chỉ huy quân sự.",
      "sourceRef": "B.5, tr.9; D.5, tr.14"
    },
    {
      "id": "vnr-4-14",
      "difficulty": 4,
      "topic": "Đại hội III và hai chiến lược",
      "familyId": "vnr-family-14",
      "format": "case-analysis",
      "prompt": "Một phương án yêu cầu hoàn thành xây dựng miền Bắc rồi mới tiếp tục giải phóng miền Nam. Nó trái đường lối ở điểm nào?",
      "options": [
        {
          "id": "o1",
          "text": "Đã coi hai nhiệm vụ cùng hướng mục tiêu thống nhất."
        },
        {
          "id": "o2",
          "text": "Đã phân biệt tính chất cách mạng ở hai miền."
        },
        {
          "id": "o3",
          "text": "Đã đặt nhiệm vụ miền Bắc trong quan hệ với cách mạng cả nước."
        },
        {
          "id": "o4",
          "text": "Đổi quan hệ đồng thời, hỗ trợ nhau thành hai giai đoạn nối tiếp tách rời."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Hai nhiệm vụ khác tính chất nhưng đồng thời và cùng hướng mục tiêu chung.",
      "sourceRef": "C.1–C.2, tr.9–10"
    },
    {
      "id": "vnr-4-15",
      "difficulty": 4,
      "topic": "Quyết định nhất và trực tiếp",
      "familyId": "vnr-family-15",
      "format": "case-analysis",
      "prompt": "Một người suy rằng miền Bắc quyết định nhất nên lực lượng tại miền Nam chỉ thụ động nhận chi viện. Sai ở đâu?",
      "options": [
        {
          "id": "o1",
          "text": "Chưa coi miền Nam có vai trò quyết định nhất về cơ sở vật chất của miền Bắc."
        },
        {
          "id": "o2",
          "text": "Đã phân biệt hai phạm vi vai trò thay vì đánh đồng chúng."
        },
        {
          "id": "o3",
          "text": "Đã biến vai trò hậu phương chiến lược thành sự thay thế vai trò trực tiếp, chủ động của miền Nam."
        },
        {
          "id": "o4",
          "text": "Chưa đặt việc xây dựng miền Bắc thành nhiệm vụ riêng biệt khỏi cả nước."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Hai phạm vi quyết định khác nhau: nền tảng chiến lược toàn cục và đấu tranh trực tiếp giải phóng miền Nam.",
      "sourceRef": "C.2, tr.10"
    },
    {
      "id": "vnr-4-16",
      "difficulty": 4,
      "topic": "Hòa bình và chuẩn bị",
      "familyId": "vnr-family-16",
      "format": "case-analysis",
      "prompt": "Một đề xuất bỏ chuẩn bị quốc phòng để chứng minh thiện chí hòa bình. Thiếu sót chính là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Chưa coi ngoại giao là hình thức duy nhất của mọi nhiệm vụ cách mạng."
        },
        {
          "id": "o2",
          "text": "Đánh đồng kiên trì mục tiêu hòa bình với bỏ cảnh giác trước nguy cơ chiến tranh."
        },
        {
          "id": "o3",
          "text": "Chưa đòi chuyển mọi hoạt động kinh tế thành tiến công quân sự."
        },
        {
          "id": "o4",
          "text": "Đã đặt quốc phòng và đời sống trong cùng một đường lối."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Mục tiêu và việc chuẩn bị bảo vệ mục tiêu có thể bổ sung nhau, không tất yếu mâu thuẫn.",
      "sourceRef": "C.1, tr.9–10"
    },
    {
      "id": "vnr-4-17",
      "difficulty": 4,
      "topic": "Công nghiệp hóa hợp lý",
      "familyId": "vnr-family-17",
      "format": "case-analysis",
      "prompt": "Một kế hoạch chỉ đầu tư công nghiệp nặng, hoãn nông nghiệp và giáo dục. Cần điều chỉnh theo hướng nào?",
      "options": [
        {
          "id": "o1",
          "text": "Giữ ưu tiên hợp lý nhưng kết hợp các ngành và đời sống để xây dựng nền tảng toàn diện."
        },
        {
          "id": "o2",
          "text": "Tăng ưu tiên cho một ngành để không phải điều phối nguồn lực."
        },
        {
          "id": "o3",
          "text": "Bỏ mọi đầu tư cơ sở vật chất, chỉ giải quyết tiêu dùng trước mắt."
        },
        {
          "id": "o4",
          "text": "Thay giáo dục bằng chỉ tiêu sản lượng thép để đơn giản hóa đánh giá."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Ưu tiên không đồng nghĩa độc tôn một ngành hoặc bỏ phối hợp các mặt phát triển.",
      "sourceRef": "C.3, tr.10–11"
    },
    {
      "id": "vnr-4-18",
      "difficulty": 4,
      "topic": "Kế hoạch1961–1965",
      "familyId": "vnr-family-18",
      "format": "case-analysis",
      "prompt": "Có ý kiến kế hoạch phải chuyển hướng nên toàn bộ đầu tư trước đó không còn ý nghĩa. Phản biện nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Điều chỉnh kế hoạch chứng minh mọi chỉ tiêu đều đã vượt dự kiến."
        },
        {
          "id": "o2",
          "text": "Chỉ cần giữ tên kế hoạch là chứng minh hiệu quả, không cần kết quả."
        },
        {
          "id": "o3",
          "text": "Vì có chiến tranh nên không thể đánh giá bất kỳ thành tựu nào."
        },
        {
          "id": "o4",
          "text": "Những tiềm lực kinh tế, chính trị, quốc phòng được củng cố vẫn có ý nghĩa trong hoàn cảnh mới."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Đánh giá kế hoạch phải gắn mục tiêu, kết quả và điều kiện lịch sử, tránh kết luận tuyệt đối.",
      "sourceRef": "D.1, tr.11–12"
    },
    {
      "id": "vnr-4-19",
      "difficulty": 4,
      "topic": "Hệ thống chi viện",
      "familyId": "vnr-family-19",
      "format": "case-analysis",
      "prompt": "Một kế hoạch chi viện chỉ tính số chuyến xe mà không xét hàng hóa, cán bộ và tiếp nhận. Nhận xét nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "Cần bỏ lực lượng địa phương để hệ thống không có nhiều đầu mối."
        },
        {
          "id": "o2",
          "text": "Cần tách nguồn lực hậu phương khỏi yêu cầu thực tế của miền Nam."
        },
        {
          "id": "o3",
          "text": "Chỉ đo một khâu vận tải, chưa bảo đảm sự phối hợp của toàn hệ thống chi viện."
        },
        {
          "id": "o4",
          "text": "Đã đủ vì số chuyến xe luôn đồng nghĩa đáp ứng mọi nhu cầu chiến trường."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Chi viện nối nhiều khâu và nhiều lực lượng, không phải một tuyến đường độc lập.",
      "sourceRef": "D.2, tr.12"
    },
    {
      "id": "vnr-4-20",
      "difficulty": 4,
      "topic": "Chiến tranh đặc biệt",
      "familyId": "vnr-family-20",
      "format": "case-analysis",
      "prompt": "Một phân tích chỉ liệt kê vũ khí Mỹ và coi kiểm soát dân cư không liên quan. Cần bổ sung gì?",
      "options": [
        {
          "id": "o1",
          "text": "Quan điểm phương tiện hiện đại tự bảo đảm thắng lợi không cần tổ chức kiểm soát."
        },
        {
          "id": "o2",
          "text": "Quan hệ giữa hoạt động quân sự với ấp chiến lược nhằm tách cách mạng khỏi quần chúng."
        },
        {
          "id": "o3",
          "text": "Vai trò hoàn toàn độc lập của quân đội Sài Gòn khỏi cố vấn Mỹ."
        },
        {
          "id": "o4",
          "text": "Việc Mỹ đã rút hết cố vấn ngay đầu giai đoạn1961–1965."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược.",
      "sourceRef": "D.3, tr.12–13"
    },
    {
      "id": "vnr-4-21",
      "difficulty": 4,
      "topic": "Hai chân ba mũi ba vùng",
      "familyId": "vnr-family-21",
      "format": "case-analysis",
      "prompt": "Một địa bàn đô thị nhiều công nhân, học sinh và trí thức cần vận dụng phương châm theo vùng. Hình thức chủ yếu phù hợp là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Đấu tranh chính trị của quần chúng, phối hợp hình thức khác theo điều kiện."
        },
        {
          "id": "o2",
          "text": "Lấy phá ấp chiến lược bằng quân sự làm hình thức duy nhất ở nội đô."
        },
        {
          "id": "o3",
          "text": "Tổ chức tác chiến chủ lực quy mô lớn làm trọng tâm bất kể lực lượng."
        },
        {
          "id": "o4",
          "text": "Chỉ binh vận, không tổ chức phong trào quần chúng tại địa bàn."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Không nhầm hình thức tiến công, loại địa bàn và phân chia địa lý toàn quốc.",
      "sourceRef": "D.4, tr.13–14"
    },
    {
      "id": "vnr-4-22",
      "difficulty": 4,
      "topic": "Phá ấp chiến lược",
      "familyId": "vnr-family-22",
      "format": "case-analysis",
      "prompt": "Một phương án đánh đồn nhưng bỏ cơ sở quần chúng và binh vận có hạn chế nào?",
      "options": [
        {
          "id": "o1",
          "text": "Đã đáp ứng đủ ba mũi vì một trận quân sự có thể thay mọi hoạt động."
        },
        {
          "id": "o2",
          "text": "Chỉ cần tăng vũ khí mà không cần tổ chức chính trị tại chỗ."
        },
        {
          "id": "o3",
          "text": "Chỉ thiếu tuyên truyền quốc tế, không liên quan dân cư ở địa bàn."
        },
        {
          "id": "o4",
          "text": "Khó tác động đầy đủ hệ thống kiểm soát và khả năng giữ dân, giữ đất."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Hệ thống kiểm soát có nhiều mặt; ba mũi bổ sung nhau để tác động toàn diện.",
      "sourceRef": "D.3–D.4, tr.12–14"
    },
    {
      "id": "vnr-4-23",
      "difficulty": 4,
      "topic": "Tổ chức lực lượng",
      "familyId": "vnr-family-23",
      "format": "case-analysis",
      "prompt": "Một nhận định cho rằng tổ chức mới chỉ làm tăng số cơ quan nên không tăng hiệu quả. Cần xem thêm điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Mức giảm liên hệ giữa chính trị với vũ trang sau khi tổ chức lại."
        },
        {
          "id": "o2",
          "text": "Khả năng hoạt động tách biệt khỏi chi viện và phong trào quần chúng."
        },
        {
          "id": "o3",
          "text": "Chất lượng thống nhất chỉ huy, phối hợp lực lượng và liên hệ cơ sở."
        },
        {
          "id": "o4",
          "text": "Chỉ số lượng tên tổ chức, không cần chức năng hoặc quan hệ chỉ đạo."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Kiện toàn tổ chức tạo năng lực phối hợp; không chỉ tăng số lượng tên gọi hoặc xóa vai trò lực lượng khác.",
      "sourceRef": "D.5, tr.14"
    },
    {
      "id": "vnr-4-24",
      "difficulty": 4,
      "topic": "Ấp Bắc và đấu tranh tổng hợp",
      "familyId": "vnr-family-24",
      "format": "case-analysis",
      "prompt": "Một bài thuyết trình giải thích thất bại Chiến tranh đặc biệt chỉ bằng Ấp Bắc. Hạn chế chính là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Chưa coi ưu thế phương tiện của đối phương là nguyên nhân bảo đảm họ thất bại."
        },
        {
          "id": "o2",
          "text": "Bỏ quá trình phối hợp nhiều thắng lợi, phong trào chính trị, phá ấp và chi viện."
        },
        {
          "id": "o3",
          "text": "Chưa khẳng định Chiến tranh đặc biệt đã kết thúc ngay sau một trận đánh."
        },
        {
          "id": "o4",
          "text": "Đã đưa vai trò quần chúng vào quan hệ với tác chiến quân sự."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược.",
      "sourceRef": "D.6, tr.14–15"
    },
    {
      "id": "vnr-4-25",
      "difficulty": 4,
      "topic": "Đánh giá giới hạn thắng lợi",
      "familyId": "vnr-family-25",
      "format": "case-analysis",
      "prompt": "Một kết luận dùng thắng lợi năm1965 để nói đất nước đã giải phóng, thống nhất hoàn toàn. Cách sửa nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "Giữ ý nghĩa chiến lược của thắng lợi nhưng nêu rõ nhiệm vụ giải phóng, thống nhất còn tiếp tục."
        },
        {
          "id": "o2",
          "text": "Bỏ ý nghĩa thắng lợi vì mọi kết quả trước thống nhất đều không quan trọng."
        },
        {
          "id": "o3",
          "text": "Chỉ đổi tên chiến lược chiến tranh mà giữ nguyên kết luận hoàn thành thống nhất."
        },
        {
          "id": "o4",
          "text": "Chuyển toàn bộ kết quả xây dựng miền Bắc thành kết quả của một trận đánh ở miền Nam."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Phải phân biệt kết quả giai đoạn với thắng lợi cuối cùng và ghi nhận cả thành tựu, hạn chế.",
      "sourceRef": "E.1–E.3, tr.15–16"
    },
    {
      "id": "vnr-5-01",
      "difficulty": 5,
      "topic": "Hai nhiệm vụ chiến lược",
      "familyId": "vnr-family-01",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước. (2) Chủ quan, giáo điều và đánh giá không đầy đủ quan hệ xã hội thực tế. (3) Hoàn thành ngay giải phóng miền Nam và thống nhất cả nước. (4) Sản xuất, chuẩn bị nhân lực, hậu cần và vận tải phải phối hợp từ hậu phương tới chiến trường. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o4",
          "text": "(2), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (3) sai: Bước ngoặt về thế cách mạng cần phân biệt với thắng lợi cuối cùng. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "A.1–A.3, tr.3–5; C.1, tr.9; B.2, tr.6; B.5, tr.8–9; E.2, tr.15; D.2, tr.12"
    },
    {
      "id": "vnr-5-02",
      "difficulty": 5,
      "topic": "Độc lập tự chủ và quốc tế",
      "familyId": "vnr-family-02",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Giữ độc lập, tự chủ đồng thời tranh thủ sự ủng hộ quốc tế. (2) Đổi hình thức tổ chức không tự tạo đủ cơ sở vật chất, kỹ thuật và năng lực sản xuất. (3) Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung. (4) Mỹ chỉ hỗ trợ kinh tế, không tham gia cố vấn và phương tiện quân sự. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o3",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (4) sai: Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "A.2, tr.4; B.3, tr.7; C.3, tr.10–11; B.5, tr.9; D.5, tr.14; D.3, tr.12–13"
    },
    {
      "id": "vnr-5-03",
      "difficulty": 5,
      "topic": "Khôi phục nông nghiệp",
      "familyId": "vnr-family-03",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Ưu tiên nông nghiệp có nghĩa chưa cần củng cố chính quyền và an ninh. (2) Tự nguyện, cùng có lợi và quản lý dân chủ. (3) Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam. (4) Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o2",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (1) sai: Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.1, tr.5–6; B.3, tr.7; C.1–C.2, tr.9–10; D.4, tr.13–14"
    },
    {
      "id": "vnr-5-04",
      "difficulty": 5,
      "topic": "Tiếp quản và xây dựng",
      "familyId": "vnr-family-04",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Tạo điều kiện quản lý thống nhất, phục hồi sản xuất và các dịch vụ thiết yếu. (2) Tập thể hóa toàn bộ công thương nghiệp bằng tổ đổi công nông nghiệp. (3) Miền Bắc quyết định nhất đối với cả nước; miền Nam quyết định trực tiếp đối với giải phóng miền Nam. (4) Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (3)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (2) sai: Phải phân biệt hình thức cải tạo công thương nghiệp với tổ chức hợp tác hóa trong nông nghiệp. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.1, tr.5–6; B.3, tr.7; C.2, tr.10; D.3–D.4, tr.12–14"
    },
    {
      "id": "vnr-5-05",
      "difficulty": 5,
      "topic": "Kết quả cải cách ruộng đất",
      "familyId": "vnr-family-05",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động. (2) Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới. (3) Kiên trì hòa bình cho phép không cần dự kiến tình huống quân sự. (4) Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o4",
          "text": "(2), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (3) sai: Mục tiêu và việc chuẩn bị bảo vệ mục tiêu có thể bổ sung nhau, không tất yếu mâu thuẫn. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.2, tr.6; B.4, tr.7–8; C.1, tr.9–10; D.5, tr.14"
    },
    {
      "id": "vnr-5-06",
      "difficulty": 5,
      "topic": "Sai lầm và sửa sai",
      "familyId": "vnr-family-06",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Chủ quan, giáo điều và đánh giá không đầy đủ quan hệ xã hội thực tế. (2) Kết hợp đấu tranh chính trị với đấu tranh vũ trang, phát huy sức mạnh quần chúng. (3) Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội. (4) Làm miền Nam không còn cần tiếp nhận nguồn lực từ hậu phương. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o3",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (4) sai: Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.2, tr.6; B.5, tr.8–9; C.3, tr.10–11; D.6, tr.14–15"
    },
    {
      "id": "vnr-5-07",
      "difficulty": 5,
      "topic": "Cải tạo và phát triển",
      "familyId": "vnr-family-07",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Chỉ cần đổi sở hữu thì năng suất tự tăng, không cần tích lũy vật chất. (2) Góp phần chuyển từ giữ gìn lực lượng sang thế tiến công và mở rộng quyền làm chủ. (3) Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả. (4) Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o2",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (1) sai: Hai mặt có liên hệ, không được tách rời hoặc coi một mặt tự động thay thế mặt kia. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.3, tr.7; C.3, tr.10–11; B.5, tr.8–9; E.2, tr.15; D.1, tr.11–12; E.1–E.3, tr.15–16"
    },
    {
      "id": "vnr-5-08",
      "difficulty": 5,
      "topic": "Nguyên tắc hợp tác xã",
      "familyId": "vnr-family-08",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Tự nguyện, cùng có lợi và quản lý dân chủ. (2) Thống nhất mọi hoạt động thành nhiệm vụ xây dựng kinh tế miền Bắc. (3) Sản xuất, chuẩn bị nhân lực, hậu cần và vận tải phải phối hợp từ hậu phương tới chiến trường. (4) Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (3)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (2) sai: Vai trò mặt trận là chính trị – đoàn kết rộng rãi; không đồng nhất với tuyến hậu cần hoặc chỉ huy quân sự. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.3, tr.7; B.5, tr.9; D.5, tr.14; D.2, tr.12; A.1–A.3, tr.3–5; C.1, tr.9"
    },
    {
      "id": "vnr-5-09",
      "difficulty": 5,
      "topic": "Cải tạo công thương nghiệp",
      "familyId": "vnr-family-09",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất. (2) Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam. (3) Chương trình kiểm soát dân cư tách rời và không phục vụ hoạt động quân sự. (4) Giữ độc lập, tự chủ đồng thời tranh thủ sự ủng hộ quốc tế. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o4",
          "text": "(2), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (3) sai: Cần đặt lực lượng quân sự, hỗ trợ Mỹ và bình định dân cư trong cùng một chiến lược. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.3, tr.7; C.1–C.2, tr.9–10; D.3, tr.12–13; A.2, tr.4"
    },
    {
      "id": "vnr-5-10",
      "difficulty": 5,
      "topic": "Miền Nam 1954–1958",
      "familyId": "vnr-family-10",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới. (2) Miền Bắc quyết định nhất đối với cả nước; miền Nam quyết định trực tiếp đối với giải phóng miền Nam. (3) Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị. (4) Nông nghiệp phải thay thế mọi nhiệm vụ công nghiệp và giao thông trong suốt thời kỳ. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o3",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (4) sai: Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.4, tr.7–8; C.2, tr.10; D.4, tr.13–14; B.1, tr.5–6"
    },
    {
      "id": "vnr-5-11",
      "difficulty": 5,
      "topic": "Nghị quyết Trung ương 15",
      "familyId": "vnr-family-11",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Giữ đấu tranh chính trị đơn thuần dù mức đàn áp thay đổi. (2) Mục tiêu hòa bình cần được bảo vệ bằng cảnh giác và chuẩn bị trước nguy cơ thực tế. (3) Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận. (4) Tạo điều kiện quản lý thống nhất, phục hồi sản xuất và các dịch vụ thiết yếu. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o2",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (1) sai: Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.5, tr.8–9; C.1, tr.9–10; D.3–D.4, tr.12–14; B.1, tr.5–6"
    },
    {
      "id": "vnr-5-12",
      "difficulty": 5,
      "topic": "Đồng khởi",
      "familyId": "vnr-family-12",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Góp phần chuyển từ giữ gìn lực lượng sang thế tiến công và mở rộng quyền làm chủ. (2) Dùng công nghiệp nặng thay nhiệm vụ giáo dục, khoa học và đời sống. (3) Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động. (4) Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (3)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (2) sai: Ưu tiên không đồng nghĩa độc tôn một ngành hoặc bỏ phối hợp các mặt phát triển. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.5, tr.8–9; E.2, tr.15; C.3, tr.10–11; D.5, tr.14; B.2, tr.6"
    },
    {
      "id": "vnr-5-13",
      "difficulty": 5,
      "topic": "Mặt trận giải phóng",
      "familyId": "vnr-family-13",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung. (2) Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả. (3) Hoàn thành đánh bại mọi chiến lược chiến tranh của Mỹ ngay năm1963. (4) Chủ quan, giáo điều và đánh giá không đầy đủ quan hệ xã hội thực tế. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o4",
          "text": "(2), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (3) sai: Ý nghĩa quân sự và tác động chính trị cần phân biệt với thắng lợi cuối cùng của cả chiến lược. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "B.5, tr.9; D.5, tr.14; D.1, tr.11–12; D.6, tr.14–15; B.2, tr.6"
    },
    {
      "id": "vnr-5-14",
      "difficulty": 5,
      "topic": "Đại hội III và hai chiến lược",
      "familyId": "vnr-family-14",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam. (2) Sản xuất, chuẩn bị nhân lực, hậu cần và vận tải phải phối hợp từ hậu phương tới chiến trường. (3) Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước. (4) Phải hoàn thành công nghiệp hóa mới được tổ chức lại quan hệ sản xuất. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o3",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (4) sai: Hai mặt có liên hệ, không được tách rời hoặc coi một mặt tự động thay thế mặt kia. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "C.1–C.2, tr.9–10; D.2, tr.12; E.1–E.3, tr.15–16; B.3, tr.7; C.3, tr.10–11"
    },
    {
      "id": "vnr-5-15",
      "difficulty": 5,
      "topic": "Quyết định nhất và trực tiếp",
      "familyId": "vnr-family-15",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Vai trò quyết định nhất cho phép miền Bắc thay thế lực lượng cách mạng tại miền Nam. (2) Quân đội Sài Gòn chiến đấu chủ yếu, có cố vấn và phương tiện Mỹ cùng biện pháp kiểm soát dân cư. (3) Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước. (4) Tự nguyện, cùng có lợi và quản lý dân chủ. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o2",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (1) sai: Hai phạm vi quyết định khác nhau: nền tảng chiến lược toàn cục và đấu tranh trực tiếp giải phóng miền Nam. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "C.2, tr.10; D.3, tr.12–13; A.1–A.3, tr.3–5; C.1, tr.9; B.3, tr.7"
    },
    {
      "id": "vnr-5-16",
      "difficulty": 5,
      "topic": "Hòa bình và chuẩn bị",
      "familyId": "vnr-family-16",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Mục tiêu hòa bình cần được bảo vệ bằng cảnh giác và chuẩn bị trước nguy cơ thực tế. (2) Ba mũi là quân sự, chính trị, ngoại giao; ba vùng là Bắc, Trung, Nam. (3) Giữ độc lập, tự chủ đồng thời tranh thủ sự ủng hộ quốc tế. (4) Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (3)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (2) sai: Không nhầm hình thức tiến công, loại địa bàn và phân chia địa lý toàn quốc. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "C.1, tr.9–10; D.4, tr.13–14; A.2, tr.4; B.3, tr.7"
    },
    {
      "id": "vnr-5-17",
      "difficulty": 5,
      "topic": "Công nghiệp hóa hợp lý",
      "familyId": "vnr-family-17",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội. (2) Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận. (3) Nông nghiệp đã hoàn thành hiện đại hóa nên có thể tạo nguồn xuất khẩu lớn ngay. (4) Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o4",
          "text": "(2), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (3) sai: Nhiệm vụ trước mắt tạo nền tảng đời sống và chính trị cho phát triển tiếp theo. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "C.3, tr.10–11; D.3–D.4, tr.12–14; B.1, tr.5–6; B.4, tr.7–8"
    },
    {
      "id": "vnr-5-18",
      "difficulty": 5,
      "topic": "Kế hoạch1961–1965",
      "familyId": "vnr-family-18",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả. (2) Tăng khả năng thống nhất tổ chức, chỉ huy và phối hợp hoạt động. (3) Tạo điều kiện quản lý thống nhất, phục hồi sản xuất và các dịch vụ thiết yếu. (4) Lấy vận động quốc tế thay việc xây dựng lực lượng tại miền Nam. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o3",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (4) sai: Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "D.1, tr.11–12; D.5, tr.14; B.1, tr.5–6; B.5, tr.8–9"
    },
    {
      "id": "vnr-5-19",
      "difficulty": 5,
      "topic": "Hệ thống chi viện",
      "familyId": "vnr-family-19",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Chỉ mở đường vận tải là đủ, có thể bỏ khâu sản xuất và tổ chức tiếp nhận. (2) Củng cố khả năng và tinh thần chống càn, hỗ trợ phong trào quần chúng và phá ấp chiến lược. (3) Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động. (4) Góp phần chuyển từ giữ gìn lực lượng sang thế tiến công và mở rộng quyền làm chủ. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o2",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (1) sai: Chi viện nối nhiều khâu và nhiều lực lượng, không phải một tuyến đường độc lập. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "D.2, tr.12; D.6, tr.14–15; B.2, tr.6; B.5, tr.8–9; E.2, tr.15"
    },
    {
      "id": "vnr-5-20",
      "difficulty": 5,
      "topic": "Chiến tranh đặc biệt",
      "familyId": "vnr-family-20",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Quân đội Sài Gòn chiến đấu chủ yếu, có cố vấn và phương tiện Mỹ cùng biện pháp kiểm soát dân cư. (2) Chỉ là biến đổi tên gọi chiến tranh, không có ý nghĩa về thế và lực. (3) Chủ quan, giáo điều và đánh giá không đầy đủ quan hệ xã hội thực tế. (4) Tập hợp rộng rãi các tầng lớp, lực lượng yêu nước vì mục tiêu chung. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (3)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (2) sai: Phải phân biệt kết quả giai đoạn với thắng lợi cuối cùng và ghi nhận cả thành tựu, hạn chế. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "D.3, tr.12–13; E.1–E.3, tr.15–16; B.2, tr.6; B.5, tr.9; D.5, tr.14"
    },
    {
      "id": "vnr-5-21",
      "difficulty": 5,
      "topic": "Hai chân ba mũi ba vùng",
      "familyId": "vnr-family-21",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Ba mũi là quân sự, chính trị, binh vận; ba vùng là miền núi, nông thôn đồng bằng, đô thị. (2) Hai miền khác điều kiện chính trị – xã hội nhưng cùng hướng tới thống nhất đất nước. (3) Phát triển lực lượng sản xuất làm mất nhu cầu cải tạo quan hệ sản xuất. (4) Cách mạng xã hội chủ nghĩa ở miền Bắc và dân tộc dân chủ nhân dân ở miền Nam. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o4",
          "text": "(2), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (3) sai: Hai mặt có liên hệ, không được tách rời hoặc coi một mặt tự động thay thế mặt kia. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "D.4, tr.13–14; A.1–A.3, tr.3–5; C.1, tr.9; B.3, tr.7; C.3, tr.10–11; C.1–C.2, tr.9–10"
    },
    {
      "id": "vnr-5-22",
      "difficulty": 5,
      "topic": "Phá ấp chiến lược",
      "familyId": "vnr-family-22",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Cần kết hợp phá kiểm soát dân cư, phát huy quần chúng và hoạt động quân sự, binh vận. (2) Giữ độc lập, tự chủ đồng thời tranh thủ sự ủng hộ quốc tế. (3) Tự nguyện, cùng có lợi và quản lý dân chủ. (4) Miền Bắc quyết định trực tiếp giải phóng miền Nam; miền Nam quyết định nhất đối với cả nước. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o3",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (4) sai: Hai phạm vi quyết định khác nhau: nền tảng chiến lược toàn cục và đấu tranh trực tiếp giải phóng miền Nam. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "D.3–D.4, tr.12–14; A.2, tr.4; B.3, tr.7; C.2, tr.10"
    },
    {
      "id": "vnr-5-23",
      "difficulty": 5,
      "topic": "Tổ chức lực lượng",
      "familyId": "vnr-family-23",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Thay thế nhu cầu xây dựng lực lượng chính trị và tổ chức quần chúng. (2) Nông nghiệp giữ vai trò chủ yếu, gắn trực tiếp lương thực, sinh kế và ổn định xã hội. (3) Cải tạo hòa bình qua các hình thức như công tư hợp doanh và chuộc lại tư liệu sản xuất. (4) Mục tiêu hòa bình cần được bảo vệ bằng cảnh giác và chuẩn bị trước nguy cơ thực tế. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o2",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (1) sai: Kiện toàn tổ chức tạo năng lực phối hợp; không chỉ tăng số lượng tên gọi hoặc xóa vai trò lực lượng khác. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "D.5, tr.14; B.1, tr.5–6; B.3, tr.7; C.1, tr.9–10"
    },
    {
      "id": "vnr-5-24",
      "difficulty": 5,
      "topic": "Ấp Bắc và đấu tranh tổng hợp",
      "familyId": "vnr-family-24",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Củng cố khả năng và tinh thần chống càn, hỗ trợ phong trào quần chúng và phá ấp chiến lược. (2) Hoàn thành cả nhiệm vụ giải phóng miền Nam và thống nhất quốc gia. (3) Đòi thi hành Hiệp định, tập hợp quần chúng và giữ gìn lực lượng trong tương quan mới. (4) Ưu tiên hợp lý đồng thời phát triển nông nghiệp, công nghiệp nhẹ và các lĩnh vực xã hội. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(2), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o4",
          "text": "(1), (2), (3)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (2) sai: Tiếp quản tạo điều kiện chính trị – quản lý, không đồng nghĩa hoàn thành mọi nhiệm vụ kinh tế hoặc thống nhất. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "D.6, tr.14–15; B.1, tr.5–6; B.4, tr.7–8; C.3, tr.10–11"
    },
    {
      "id": "vnr-5-25",
      "difficulty": 5,
      "topic": "Đánh giá giới hạn thắng lợi",
      "familyId": "vnr-family-25",
      "format": "integrated-claims",
      "prompt": "Đánh giá bản tổng hợp sau: (1) Có ý nghĩa chiến lược nhưng chưa hoàn thành giải phóng miền Nam và thống nhất đất nước. (2) Thay đổi quan hệ sở hữu ruộng đất và quyền lợi của nông dân lao động. (3) Thay thế phong trào chính trị bằng hoạt động quân sự tách khỏi quần chúng. (4) Cần xét kết quả chủ yếu và bối cảnh chuyển hướng, không đồng nhất điều chỉnh với vô hiệu quả. Nhóm nào gồm đúng toàn bộ các nhận định phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (3), (4)"
        },
        {
          "id": "o2",
          "text": "(1), (2), (4)"
        },
        {
          "id": "o3",
          "text": "(1), (2), (3)"
        },
        {
          "id": "o4",
          "text": "(2), (3), (4)"
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhận định (3) sai: Chủ trương phát triển đấu tranh vũ trang không đồng nghĩa loại bỏ đấu tranh chính trị. Các nhận định còn lại phù hợp phạm vi báo cáo.",
      "sourceRef": "E.1–E.3, tr.15–16; B.2, tr.6; B.5, tr.8–9; D.1, tr.11–12"
    }
  ]
}
```
