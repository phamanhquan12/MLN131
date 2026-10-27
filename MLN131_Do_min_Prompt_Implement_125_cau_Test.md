# PROMPT TRIỂN KHAI — MLN131: DÒ MÌN TRI THỨC

Bạn là agent kỹ thuật được giao triển khai, chạy và kiểm thử một web game dùng trên lớp. Hãy hoàn thành ứng dụng hoạt động được, không dừng ở kế hoạch, mockup hay đoạn mã minh họa. Tài liệu này là đặc tả quyết định cho bản đầu. Phần phụ lục chứa toàn bộ ngân hàng 125 câu, không cần truy cập cuộc trò chuyện trước để xây dựng sản phẩm.

## 1. Kết quả cần giao

1. Web game tiếng Việt, một người chơi một lượt trên một máy tính được chiếu trước lớp.
2. Lưới dò mìn 5×5; tiền thưởng hiện tại luôn nhìn rõ, kể cả khi câu hỏi đang hiển thị.
3. Ngân hàng có sẵn 125 câu, 25 câu mỗi mức, lấy từ phụ lục; xáo câu và phương án cho nhiều vòng.
4. Engine luật chơi tách khỏi UI; lưu được vòng đang chơi và lịch sử câu hỏi giữa các vòng.
5. Unit test, integration test và E2E thực sự chạy được; sửa lỗi cho đến khi các kiểm tra yêu cầu thành công trong môi trường có đủ phụ thuộc.
6. README tiếng Việt, hướng dẫn chạy, kiểm thử và host static; có build production.
7. Báo cáo kiểm thử với lệnh, kết quả, số test, coverage, môi trường và hạn chế còn lại. Không viết “đã pass” cho kiểm tra chưa chạy.

Đây là một game thưởng trên lớp, không thu tiền tham gia và không tích hợp thanh toán. Tiền là số tiền thưởng của người tổ chức cho vòng chơi. Trần 150.000đ áp dụng cho mỗi vòng, không phải tổng ngân sách cả buổi.

## 2. Phạm vi và stack

- Chỉ triển khai chế độ một máy điều khiển, một người chơi mỗi vòng. Các bạn còn lại xem máy chiếu. Không triển khai phòng nhiều người, đăng nhập, backend, cơ sở dữ liệu, WebSocket hoặc đồng bộ từ điện thoại trong bản này.
- Nếu đang có repository, đọc AGENTS.md, hướng dẫn, package manager và cấu trúc trước khi sửa; giữ các quy ước đang dùng. Không ghi đè phần việc không liên quan.
- Nếu bắt đầu mới: TypeScript strict + Vite, UI DOM/CSS đơn giản, Vitest cho unit/integration, Testing Library DOM khi cần thao tác thành phần, Playwright cho E2E.
- Không thêm framework nặng hoặc dịch vụ trả phí nếu không có nhu cầu thực tế. Nếu repo đã dùng React thì có thể tiếp tục dùng, vẫn giữ engine thuần và cùng các yêu cầu kiểm thử.
- Chọn các phiên bản ổn định tương thích môi trường tại lúc triển khai; dùng lockfile. Tra tài liệu chính thức khi cần API hoặc cấu hình, không sao chép ví dụ lỗi thời một cách máy móc.
- Chạy được bằng HTTP local; build thành tài nguyên static có thể host. Không phụ thuộc API sinh câu hỏi, API AI, CDN font hoặc dịch vụ bên ngoài để chơi.
- Không mặc định ứng dụng static chống được chỉnh sửa bằng DevTools. Đây là chế độ người dẫn chương trình kiểm soát; không tuyên bố tính chống gian lận hoặc tính toàn vẹn thanh toán như hệ thống có máy chủ.

## 3. Thiết lập vòng và bàn cờ

### 3.1 Cấu hình mặc định

```ts
const DEFAULT_RULES = {
  rows: 5,
  cols: 5,
  mineCount: 10,
  lifeGiftCount: 2,
  bonusGiftCount: 3,
  startingCashVnd: 10_000,
  cashCapVnd: 150_000,
  safeGainVnd: 8_000,
  boostedSafeGainVnd: 16_000,
  safeWrongKeepNumerator: 88,
  safeWrongKeepDenominator: 100,
  startingLives: 1,
  maxLives: 3,
  firstClickOrdinarySafe: true,
} as const;
```

Phân bố hoàn chỉnh: 10 mìn + 10 an toàn thường + 2 quà mạng + 3 quà bonus = 25 ô. Cả hai loại quà thuộc 15 ô an toàn, không chồng lên mìn.

### 3.2 Ô đầu và sinh ngẫu nhiên

- Ô chọn đầu tiên luôn an toàn thường. Chỉ chốt vị trí mìn và quà sau khi biết tọa độ đó; sinh một lần rồi lưu ngay.
- 24 vị trí còn lại chứa đúng 10 mìn, 2 quà mạng, 3 quà bonus và 9 ô thường.
- Dùng Fisher–Yates hoặc cách lấy mẫu không hoàn lại đúng; không dùng `sort(() => Math.random() - 0.5)`.
- Dùng nguồn ngẫu nhiên có thể inject/seed để test tái lập. Vòng thực nhận seed mới từ nguồn ngẫu nhiên trình duyệt.
- Tách luồng ngẫu nhiên của bàn, chọn câu và xáo phương án để không tạo tương quan giữa loại ô và câu hỏi. Lưu đủ trạng thái để reload không đổi kết quả đã chọn.
- Số liền kề là số MÌN trong tối đa 8 ô lân cận, không tính ô quà. Không wrap từ cuối hàng sang đầu hàng kế tiếp.
- Không tự mở vùng số 0, không chord mở hàng loạt: một lần chọn ô tương ứng một câu hỏi duy nhất.
- Có thể cắm/gỡ cờ bằng thao tác rõ ràng hoặc chuột phải. Cờ không tính là mở ô, không gọi câu hỏi, không đổi tiền/mạng. Ô cắm cờ phải được gỡ cờ trước khi mở.

### 3.3 Chu trình mở ô

1. Chỉ nhận chọn ô khi sẵn sàng, ô còn kín, không cắm cờ và vòng chưa kết thúc.
2. Ghi nhận số tiền trước lượt; tính difficulty từ số tiền này.
3. Sinh bàn nếu đây là ô đầu; chọn câu đúng difficulty chưa dùng trong vòng; xáo phương án và lưu kết quả lựa chọn cùng turnId.
4. Hiện loại ô (an toàn/quà/mìn) và câu hỏi; khi nội dung đã hiển thị đầy đủ mới kích hoạt deadline một lần.
5. Người chơi chọn một phương án và bấm xác nhận. Chọn radio chưa phải nộp bài. Không có lựa chọn thì nút xác nhận bị vô hiệu hóa.
6. Chấm bài hoặc xử lý hết giờ, cập nhật tiền/mạng/bonus đúng một lần và lưu kết quả.
7. Hiện đáp án đúng, đáp án đã chọn, giải thích ngắn, thay đổi tiền và kết quả quà/mạng. Ô trở thành đã mở, có số mìn liền kề nếu an toàn.
8. Bấm “Tiếp tục” để chọn ô kế tiếp hoặc xem màn hình kết thúc nếu có lý do kết thúc.

Không cho đổi ô, đặt lại bàn, bỏ câu hoặc chốt tiền khi câu hỏi đang chạy. Người dẫn chương trình có thể tạm dừng đồng hồ theo quy tắc bên dưới.

## 4. Luật tiền, mạng và bonus — bắt buộc chính xác

Đơn vị tính tiền là số nguyên VND; không dùng số thực làm nguồn chân lý. Hệ số hiển thị m = cashVnd / 10.000, chỉ để trình bày. Không dùng hệ số đã làm tròn để tính tiền hoặc chọn difficulty.

### 4.1 Bảng kết quả

| Loại ô | Đúng | Sai/hết giờ |
|---|---|---|
| SAFE | Cộng 8.000đ, hoặc 16.000đ nếu có bonus từ lượt trước | `floor(C * 88 / 100)` |
| LIFE_GIFT | Tăng tiền như SAFE, rồi thêm một mạng, tối đa ba | `floor(C * 88 / 100)`; không nhận quà |
| BONUS_GIFT | Tăng tiền như SAFE, rồi tạo bonus cho lượt kế tiếp | `floor(C * 88 / 100)`; không nhận quà |
| MINE | `floor(C / 2)`; giữ nguyên mạng | Nếu lives > 1: giảm một mạng và `floor(C / 2)`; nếu lives = 1: lives = 0, C = 0, thua |

- Không có mức phạt riêng cho hết giờ: hết giờ là một kết quả sai với reason `timeout`.
- Sai tại ô an toàn/quà không mất mạng. Đúng tại mìn không mất mạng, dù tiền giảm nửa.
- Sau phép cộng tiền: `min(150_000, cash + gain)`.
- Không tự nâng tiền về 10.000đ sau penalty. Có thể thấp hơn tiền ban đầu.
- Không có cơ chế trừ tiền thật từ người tham gia, nợ hoặc số tiền âm.

### 4.2 Thứ tự xử lý bonus

Bonus là quyền nhân đôi PHẦN CỘNG của ô an toàn đúng ở lượt chọn ngay tiếp theo; không nhân đôi tổng tiền đang có.

Khi giải quyết lượt:
1. Đọc `pendingBonus` có từ TRƯỚC lượt đó.
2. Tiêu thụ bonus cũ cho lượt đó, dù kết quả là gì.
3. Nếu ô an toàn và đúng: gain = 16.000 nếu có bonus cũ, ngược lại 8.000; áp dụng cap.
4. Nếu ô mìn hoặc sai: áp dụng penalty thông thường, không hưởng bonus cũ.
5. Chỉ sau khi tính thưởng, nếu đúng ở BONUS_GIFT thì cấp bonus mới. Nếu đúng ở LIFE_GIFT thì thêm mạng.

Không nhân đôi thưởng ngay khi vừa nhận bonus đầu tiên. Nếu bonus cũ gặp ô BONUS_GIFT và trả lời đúng, thưởng hiện tại được tăng rồi nhận bonus mới. Hai bonus không cộng dồn thành x4.

### 4.3 Điều kiện kết thúc và chốt tiền

- Khi sẵn sàng và đã hoàn thành ít nhất một lượt, người chơi có thể bấm “Chốt thưởng”. Có xác nhận với đúng số tiền; hủy xác nhận không đổi trạng thái.
- Không cho chốt khi câu hỏi đang chạy, đang tạm dừng hoặc đang chờ xem xong feedback.
- Kết thúc tự động nếu hết mạng, tiền chạm 150.000đ hoặc đã mở đủ cả 15 ô an toàn. Ô an toàn trả lời sai vẫn là ô đã mở và tính vào 15 ô này.
- Ưu tiên lý do kết thúc khi trùng nhau: `BUSTED` > `CAP_REACHED` > `ALL_SAFE_OPENED`. `CASHED_OUT` chỉ do chốt hợp lệ giữa lượt.
- Khi giải quyết một lượt có điều kiện kết thúc, khóa vòng ngay, ghi settlement đúng một lần, nhưng vẫn cho xem feedback trước màn hình kết thúc. Bấm tiếp tục sau đó không được mở vòng trở lại hay ghi ledger lần nữa.
- Tiền chốt là cash hiện tại, ngoại trừ BUSTED bằng 0. Lịch sử phân biệt “thưởng đã chốt” với “tiền đang có”. Không gọi đây là thanh toán ngân hàng đã thực hiện.
- Vòng mới reset bàn, mạng, tiền, bonus và các câu đã dùng trong vòng; GIỮ lịch sử câu đã xuất hiện trong buổi và lịch sử kết quả.
- Không dùng nút “vòng mới” để âm thầm xóa lịch sử câu hỏi. Có nút xóa dữ liệu buổi riêng, xác nhận rõ ràng.

### 4.4 Vector chuẩn độc lập

Đưa các giá trị sau trực tiếp vào test expected, không gọi lại hàm production để tạo expected:

| Đầu vào | Kết quả |
|---|---|
| SAFE đúng, C=10.000, không bonus | C=18.000 |
| SAFE sai, C=25.000 | C=22.000 |
| SAFE sai, C=25.001 | C=22.000 |
| MINE đúng, C=25.001, lives=2 | C=12.500, lives=2 |
| MINE sai, C=25.001, lives=2 | C=12.500, lives=1, chưa thua |
| MINE sai, C=25.000, lives=1 | C=0, lives=0, BUSTED |
| BONUS_GIFT đúng, C=10.000, chưa có bonus | C=18.000, pendingBonus=true |
| SAFE đúng, C=25.000, có bonus | C=41.000, pendingBonus=false |
| SAFE sai, C=25.000, có bonus | C=22.000, pendingBonus=false |
| MINE đúng, C=25.000, có bonus | C=12.500, pendingBonus=false |
| BONUS_GIFT đúng, C=25.000, có bonus | C=41.000, pendingBonus=true |
| LIFE_GIFT đúng, C=25.000, lives=1, có bonus | C=41.000, lives=2, pendingBonus=false |
| LIFE_GIFT sai, C=25.000, lives=1 | C=22.000, lives=1 |
| SAFE đúng, C=145.000, có bonus | C=150.000, CAP_REACHED |

Không có mìn/sai: 10.000 + 15×8.000 = 130.000. Ba bonus dùng thành công thêm tối đa 24.000; trước cap là 154.000, sau cap không vượt 150.000.

## 5. HUD: hiển thị thưởng hiện tại

Đây là yêu cầu sản phẩm bắt buộc, không phải phần trang trí:

- Nhãn lớn “THƯỞNG HIỆN TẠI”, định dạng VND theo locale vi-VN, ví dụ `25.000đ`.
- Ngay bên cạnh: “Hệ số x2,50”, “Trần 150.000đ”, số mạng, bonus chờ và số ô an toàn đã mở/15.
- Tiền hiện tại vẫn nhìn thấy khi câu hỏi mở; không để dialog hoặc màn phủ che HUD. Desktop dùng bố cục bàn và panel câu hỏi cạnh nhau hoặc vùng HUD nằm trên dialog; mobile có HUD cố định đủ chỗ, không che phương án.
- Trong lượt đang hỏi: hiển thị số tiền TRƯỚC khi chấm; không cộng tiền dự đoán vào tiền thực.
- Có thể hiện riêng dự báo “Đúng ô an toàn: +8.000đ/+16.000đ”, hoặc “Đúng ô mìn: còn ...”. Phải tính dự báo với cap và phân biệt rõ với tiền hiện tại.
- Sau chấm: cập nhật HUD ngay cùng kết quả, hiện delta có dấu và tiền trước → sau. Ví dụ “−3.000đ · 25.000đ → 22.000đ”. Khi cap, delta là tiền tăng thực tế, không phải gain danh nghĩa.
- Nút chốt hiển thị “Chốt 25.000đ” chỉ khi hợp lệ. Khi đang hỏi, thay bằng trạng thái rõ ràng “Hoàn thành câu hỏi để chốt thưởng”.
- Kết thúc thua hiện 0đ; kết thúc thành công hiện đúng tiền chốt và lý do.
- Hệ số làm tròn hiển thị không quyết định tầng: C=19.999 vẫn tầng 1 dù màn hình làm tròn hệ số gần x2,00; hiện thêm tên tầng rõ ràng.
- Không đặt số tiền cố định trong UI hoặc chỉ cập nhật ở màn hình cuối. Cùng một nguồn state cấp số tiền cho HUD, xác nhận chốt, feedback, lịch sử và kết quả.

## 6. Ngân hàng 125 câu và tránh lặp giữa các vòng

### 6.1 Dữ liệu và độ khó

Phụ lục là dữ liệu dùng để triển khai: trích khối JSON vào `src/data/questions.json` hoặc file tương đương. Khối có metadata và mảng `questions`; đọc đúng `questions`, không coi metadata là câu hỏi. Không thay bằng vài câu minh họa, không sinh câu hỏi qua mạng lúc chơi. Phạm vi: Chương 6, Phần I — dân tộc. Không thêm phần tôn giáo.

| Difficulty | Tiền trước lượt | Giây |
|---|---:|---:|
| 1 | 0–19.999đ | 20 |
| 2 | 20.000–39.999đ | 25 |
| 3 | 40.000–69.999đ | 25 |
| 4 | 70.000–99.999đ | 30 |
| 5 | 100.000–149.999đ | 30 |

Lấy tầng từ cash TRƯỚC lượt. Không lấy theo tọa độ, loại ô, thứ tự câu hoặc tiền sau lượt. Sau khi tiền giảm, tầng có thể giảm ở lượt kế tiếp. Tầng và timer được đóng băng trong một lượt.

Có 25 câu mỗi tầng và tối đa 25 ô mỗi vòng, nên luôn đủ câu đúng tầng chưa dùng trong vòng. Vì vậy phiên bản này KHÔNG dùng fallback xuống tầng khác của bản ngân hàng 25 câu trước. Nếu ngân hàng sai schema hoặc thiếu câu, báo lỗi dữ liệu trước khi cho chơi; không âm thầm giảm độ khó.

### 6.2 Schema

```ts
type Difficulty = 1 | 2 | 3 | 4 | 5;
type Question = {
  id: string;
  difficulty: Difficulty;
  topic: string;
  prompt: string;
  options: { id: string; text: string }[]; // exactly 4, ids unique within question
  correctOptionId: string;               // matches exactly one option
  explanation: string;
  sourceRef: string;
};
```

- Có 125 questionId duy nhất, mỗi tầng đúng 25; bốn phương án khác nội dung sau chuẩn hóa khoảng trắng, không rỗng; đáp án trỏ đúng một optionId.
- Giữ ID nội dung phương án ổn định khi xáo. Chữ A/B/C/D chỉ là nhãn trình bày theo vị trí sau xáo; không dùng chữ của bản gốc để chấm.
- Lưu `questionId` và `optionOrder` ngay khi chọn câu. Reload không chọn lại, đổi thứ tự hoặc đổi đáp án đã chọn.
- Giữ giải thích và sourceRef cho chế độ xem kết quả/người dẫn chương trình. Không hiện đáp án trước khi chấm.
- Không dùng “tất cả phương án trên” hoặc tham chiếu A/B/C/D bên trong nội dung khi xáo.

### 6.3 Chọn câu qua nhiều vòng

Mục tiêu là không lặp trong một vòng, giảm lặp giữa các vòng nhưng không hứa không lặp vô hạn với ngân hàng hữu hạn.

1. Lọc đúng difficulty và loại các questionId đã xuất hiện trong vòng hiện tại.
2. Trong tập còn lại, ưu tiên `exposureCount` thấp nhất trong buổi.
3. Nếu bằng số lần xuất hiện, ưu tiên `lastShownSequence` cũ nhất; câu chưa xuất hiện có count=0, sequence=-1.
4. Nếu vẫn hòa, chọn ngẫu nhiên bằng RNG câu hỏi; xáo phương án bằng RNG riêng.
5. Tăng exposure và sequence khi câu được đặt vào lượt, không đợi trả lời xong. Lưu cùng state lượt để reload không tăng lần nữa.
6. Khi mọi câu của một tầng đã xuất hiện trong buổi, cho phép dùng lại theo chính sách trên nhưng vẫn cấm lặp trong vòng hiện tại.

Giới hạn exposure history theo 125 ID hợp lệ và bộ đếm, không lưu vô hạn bản sao câu hỏi. Khi khởi tạo vòng mới, giữ history; khi xóa dữ liệu buổi phải xác nhận. Sửa bộ câu sau này cần đổi bankVersion và xử lý snapshot cũ an toàn.

Nội dung đã soạn là ngân hàng học tập ban đầu, độ khó chưa được hiệu chuẩn bằng dữ liệu người chơi. Kiểm tra schema không chứng minh đáp án đúng về học thuật; cần đọc rà nội dung, giữ nguồn và ghi lại câu nào được chỉnh có lý do. Không tự làm khó bằng phủ định kép hoặc câu mơ hồ.

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
- Tên game “MLN131 — Dò mìn tri thức”; phong cách trò chơi học tập rõ ràng, không cần ảnh hoặc âm thanh ngoài mạng.
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

- Mỗi trong 25 vị trí có thể là ô đầu và luôn là ordinary-safe; count 10/10/2/3 đúng; không trùng vị trí hoặc mất ô.
- Test số lân cận bằng bàn fixture độc lập: góc, cạnh, giữa, không wrap hàng, quà không bị tính là mìn.
- Cùng seed và cùng đầu vào có bàn tái lập; biến đổi seed có thể tạo bàn khác. Không test ngẫu nhiên kiểu một lần chạy “hai bàn bắt buộc khác” vì xác suất trùng là hợp lệ.
- Kiểm tra trên tập seed cố định đủ rộng (ví dụ 1.000 seed) để phát hiện lỗi count/bounds/first click; không gọi đây là chứng minh thống kê đồng đều.
- Mỗi ô chỉ xử lý một lần; số 0 không flood-fill.

### 11.3 Câu hỏi và lựa chọn

- Validate đủ 125, đúng 25 mỗi tầng; lỗi duplicate ID, option rỗng/trùng, sai correctOptionId, difficulty ngoài miền và thiếu nguồn/giải thích.
- Threshold: 0, 19.999 → tầng 1; 20.000,39.999 → tầng 2; 40.000,69.999 → tầng 3; 70.000,99.999 → tầng 4; 100.000,149.999 → tầng 5.
- Không lấy difficulty từ multiplier đã format; không phụ thuộc cellType.
- Không lặp ID trong vòng, giữ đúng tầng sau tăng/giảm tiền; chọn được 25 câu khác nhau cùng tầng trong vòng giả lập để kiểm tra dung lượng selector.
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
7. Cash 25.000 sai safe → HUD 22.000 và x2,20; cash sau vượt ngưỡng làm câu SAU đổi tầng, câu hiện tại không đổi timer.
8. Dự báo thưởng và delta khi cap: gain danh nghĩa 16.000 nhưng cash145.000→150.000 thì delta chỉ +5.000.
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
ordinarySafe: [0,4,7,8,9,10,11,12,13,14]
bonusGift: [1,2,3]
lifeGift: [5,6]
mine: [15,16,17,18,19,20,21,22,23,24]
firstClick: 0
```

Đây là danh sách dữ liệu kiểm thử, không phải bản đồ dùng cho các vòng thực. Ở bàn này ô 0 có 0 mìn liền kề; ô 10 và ô 14 mỗi ô có 2 mìn liền kề.

### 13.2 Luồng kiểm thử

E01. Mở trang, nhập tên, bắt đầu: HUD 10.000đ, x1,00, một mạng, 25 ô kín. Chọn ô đầu, chắc chắn an toàn; HUD vẫn thấy trong câu hỏi.

E02. Đúng safe: 18.000đ; lần lượt xử lý các ô an toàn đúng để đi qua các ngưỡng và kiểm tra level/timer thay đổi theo cash trước lượt, không theo vị trí.

E03. Sai safe và timeout safe: đúng mức giữ 88%, không mất mạng; hiện giải thích và chỉ có một kết quả dù click nhanh nhiều lần.

E04. Đúng mine: mất nửa tiền, không mất mạng; sai mine với một mạng: tiền về 0, khóa bàn và chốt một kết quả thua.

E05. Nhận life rồi sai mine: mất một mạng và nửa tiền, được tiếp tục; không nhầm “còn một mạng” với đã thua.

E06. Bonus đúng ô kế tiếp cộng 16.000; bonus gặp mine/sai thì mất; chuỗi bonus→bonus cấp lại đúng; bonus→life vừa tăng tiền vừa nhận mạng.

E07. Chạy các safe index 0..14 của fixture đều đúng: ba bonus được dùng ở lượt kế tiếp, cap kích hoạt cuối, tiền 150.000, không vượt cap, settlement chỉ một. Bấm tiếp tục/reload không ghi thêm.

E08. Dùng fixture không sửa luật, đi qua cả 10 mìn bằng đáp án đúng và mở đủ 15 an toàn với ít nhất một câu an toàn sai, sao cho không chạm cap: kiểm tra ALL_SAFE_OPENED là kết thúc hợp lệ và tiền khớp ledger các bước, không bắt buộc thắng đủ150.000. Expected được tính từ chuỗi sự kiện độc lập trong test.

E09. Chốt thưởng giữa lượt: hủy không đổi tiền; xác nhận chốt đúng số, khóa bàn; reload vẫn kết quả đó; vòng mới reset tiền10.000 và giữ lịch sử buổi.

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

- [ ] Bàn đủ25 ô, đúng10 mìn/10 thường/2 mạng/3 bonus; đầu tiên luôn thường an toàn.
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

## 18. Phụ lục — ngân hàng câu hỏi đầy đủ

Nguồn học thuật: `MLN131_Bao_cao_chi_tiet_Chuong6_PhanI_co_bang_phan_cong.pdf`, Chương6, PhầnI. `sourceRef` trỏ tới mục và số trang in trên báo cáo. Tình huống vận dụng do người soạn xây dựng để kiểm tra nội dung báo cáo; không phải dữ kiện lịch sử hoặc khảo sát thực tế mới. 25 câu đầu giữ bộ khởi đầu; 100 câu bổ sung mở rộng nội dung. Một số khái niệm được kiểm tra ở nhiều yêu cầu nhận thức; không coi số câu là số chủ đề độc lập.

Khối JSON dưới đây là dữ liệu đầy đủ để trích vào ứng dụng:

```json
{
  "schemaVersion": 1,
  "bankVersion": "mln131-ch6-i-125-v1",
  "language": "vi",
  "sourceDocument": "MLN131_Bao_cao_chi_tiet_Chuong6_PhanI_co_bang_phan_cong.pdf",
  "questions": [
    {
      "id": "mln-001",
      "difficulty": 1,
      "topic": "Dân tộc theo nghĩa rộng",
      "prompt": "Trong cụm từ “dân tộc Việt Nam” dùng để chỉ toàn thể nhân dân của quốc gia Việt Nam, “dân tộc” được hiểu theo nghĩa nào?",
      "options": [
        {
          "id": "o1",
          "text": "Cộng đồng những người sử dụng cùng một tiếng mẹ đẻ."
        },
        {
          "id": "o2",
          "text": "Cộng đồng dân tộc – quốc gia."
        },
        {
          "id": "o3",
          "text": "Cộng đồng một tộc người có văn hóa riêng."
        },
        {
          "id": "o4",
          "text": "Cộng đồng cư dân cùng sinh sống tại một địa phương."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nghĩa rộng chỉ cộng đồng nhân dân một quốc gia, không chỉ một tộc người hoặc một địa bàn cư trú.",
      "sourceRef": "Mục 1.2 và 1.4, trang 4–7."
    },
    {
      "id": "mln-002",
      "difficulty": 1,
      "topic": "Dân tộc theo nghĩa hẹp",
      "prompt": "Trong cách gọi “dân tộc Tày”, khái niệm dân tộc chủ yếu chỉ đối tượng nào?",
      "options": [
        {
          "id": "o1",
          "text": "Một cộng đồng tộc người có ngôn ngữ, văn hóa và ý thức tự giác tộc người."
        },
        {
          "id": "o2",
          "text": "Một cộng đồng quốc gia có lãnh thổ và bộ máy nhà nước riêng."
        },
        {
          "id": "o3",
          "text": "Một nhóm cư dân được xác định chủ yếu bằng nghề nghiệp chung."
        },
        {
          "id": "o4",
          "text": "Một cộng đồng công dân được xác định chủ yếu bằng quốc tịch chung."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Đây là nghĩa dân tộc – tộc người; không đòi hỏi mỗi tộc người có nhà nước riêng.",
      "sourceRef": "Mục 1.3, trang 6–7."
    },
    {
      "id": "mln-003",
      "difficulty": 1,
      "topic": "Cộng đồng các dân tộc Việt Nam",
      "prompt": "Theo báo cáo, Việt Nam có bao nhiêu dân tộc, hiểu theo nghĩa tộc người?",
      "options": [
        {
          "id": "o1",
          "text": "53 dân tộc, gồm dân tộc Kinh và 52 dân tộc thiểu số."
        },
        {
          "id": "o2",
          "text": "54 dân tộc, gồm 54 dân tộc thiểu số."
        },
        {
          "id": "o3",
          "text": "55 dân tộc, gồm dân tộc Kinh và 54 dân tộc thiểu số."
        },
        {
          "id": "o4",
          "text": "54 dân tộc, gồm dân tộc Kinh và 53 dân tộc thiểu số."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Báo cáo xác định 54 tộc người, trong đó người Kinh là tộc người đa số.",
      "sourceRef": "Mục 1.3 và 3.1, trang 6 và 11."
    },
    {
      "id": "mln-004",
      "difficulty": 1,
      "topic": "Đặc trưng về tổ chức chính trị",
      "prompt": "Đặc trưng nào của dân tộc – quốc gia thể hiện rõ sự thống nhất về tổ chức chính trị?",
      "options": [
        {
          "id": "o1",
          "text": "Có phong tục và hình thức sinh hoạt văn hóa tương tự."
        },
        {
          "id": "o2",
          "text": "Có ngôn ngữ giao tiếp được sử dụng trong cộng đồng."
        },
        {
          "id": "o3",
          "text": "Có chung một nhà nước trong phạm vi chủ quyền quốc gia."
        },
        {
          "id": "o4",
          "text": "Có hoạt động trao đổi hàng hóa giữa các nhóm dân cư."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Nhà nước thể hiện và tổ chức sự thống nhất chính trị; ngôn ngữ, văn hóa và kinh tế có chức năng khác.",
      "sourceRef": "Mục 1.2, trang 5."
    },
    {
      "id": "mln-005",
      "difficulty": 1,
      "topic": "Cương lĩnh dân tộc",
      "prompt": "Phương án nào nêu đúng ba nội dung của Cương lĩnh dân tộc trong chủ nghĩa Mác – Lênin?",
      "options": [
        {
          "id": "o1",
          "text": "Các dân tộc hoàn toàn bình đẳng; được quyền tự quyết; liên hiệp công nhân tất cả các dân tộc."
        },
        {
          "id": "o2",
          "text": "Các dân tộc hoàn toàn bình đẳng; dùng chung một ngôn ngữ; liên hiệp công nhân tất cả các dân tộc."
        },
        {
          "id": "o3",
          "text": "Các dân tộc được quyền tự quyết; có trình độ kinh tế ngang nhau; duy trì văn hóa riêng biệt."
        },
        {
          "id": "o4",
          "text": "Các dân tộc có nhà nước riêng; được quyền tự quyết; liên hiệp các chính phủ cùng khu vực."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Không thay quyền tự quyết bằng đồng nhất ngôn ngữ, hoặc thay liên hiệp công nhân bằng liên hiệp chính phủ.",
      "sourceRef": "Mục 2.2, trang 9–11."
    },
    {
      "id": "mln-006",
      "difficulty": 2,
      "topic": "Ngôn ngữ chung và tiếng mẹ đẻ",
      "prompt": "Một công dân dùng tiếng Việt trong học tập, làm việc và dùng tiếng mẹ đẻ của tộc người trong gia đình. Nhận định nào phù hợp với báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Việc dùng tiếng Việt cho thấy người đó đã chuyển sang tộc người Kinh."
        },
        {
          "id": "o2",
          "text": "Việc giữ tiếng mẹ đẻ cho thấy người đó chưa tham gia cộng đồng quốc gia."
        },
        {
          "id": "o3",
          "text": "Hai ngôn ngữ chứng tỏ người đó thuộc hai dân tộc – quốc gia riêng biệt."
        },
        {
          "id": "o4",
          "text": "Ngôn ngữ giao tiếp chung có thể cùng tồn tại với ngôn ngữ riêng của tộc người."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Sự thống nhất về công cụ giao tiếp không đòi hỏi đồng nhất tiếng mẹ đẻ hoặc xóa bản sắc tộc người.",
      "sourceRef": "Mục 1.2, trang 5–6."
    },
    {
      "id": "mln-007",
      "difficulty": 2,
      "topic": "Kinh tế thống nhất",
      "prompt": "Các vùng có thế mạnh sản xuất khác nhau nhưng trao đổi hàng hóa và cùng tham gia phân công lao động. Điều này thể hiện nội dung nào?",
      "options": [
        {
          "id": "o1",
          "text": "Kinh tế thống nhất chỉ hình thành khi các vùng có cùng cơ cấu sản xuất."
        },
        {
          "id": "o2",
          "text": "Sự thống nhất kinh tế được tạo nên qua liên kết và phụ thuộc lẫn nhau giữa các vùng."
        },
        {
          "id": "o3",
          "text": "Chuyên môn hóa làm các vùng phát triển tách biệt khỏi đời sống kinh tế quốc gia."
        },
        {
          "id": "o4",
          "text": "Kinh tế thống nhất đòi hỏi thu nhập và năng suất của các vùng phải ngang nhau."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Cơ cấu sản xuất có thể khác nhau; quan hệ trao đổi và phân công lao động tạo sự gắn kết vật chất.",
      "sourceRef": "Mục 1.2, trang 4."
    },
    {
      "id": "mln-008",
      "difficulty": 2,
      "topic": "Ý thức tự giác tộc người",
      "prompt": "Một cộng đồng ít sử dụng tiếng mẹ đẻ hơn trước nhưng vẫn duy trì ký ức nguồn gốc, tên gọi và ý thức thuộc về tộc người. Nên nhận định thế nào?",
      "options": [
        {
          "id": "o1",
          "text": "Cộng đồng đã mất tư cách tộc người vì ngôn ngữ là tiêu chí duy nhất."
        },
        {
          "id": "o2",
          "text": "Cộng đồng trở thành tộc người mới ngay khi thay đổi ngôn ngữ giao tiếp."
        },
        {
          "id": "o3",
          "text": "Cần xem xét kết hợp ngôn ngữ, văn hóa và ý thức tự giác, không kết luận từ ngôn ngữ riêng lẻ."
        },
        {
          "id": "o4",
          "text": "Chỉ cần xác định nơi cư trú hiện tại là có thể kết luận cộng đồng thuộc tộc người nào."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Ý thức tự giác có vai trò đặc biệt quan trọng; việc nhận diện cần kết hợp các tiêu chí trong hoàn cảnh cụ thể.",
      "sourceRef": "Mục 1.3, trang 6–7."
    },
    {
      "id": "mln-009",
      "difficulty": 2,
      "topic": "Cư trú xen kẽ",
      "prompt": "Đặc điểm các tộc người ở Việt Nam cư trú xen kẽ đặt ra yêu cầu chính sách nào?",
      "options": [
        {
          "id": "o1",
          "text": "Phát triển hạ tầng chung và giải quyết hài hòa lợi ích của các cộng đồng cùng địa bàn."
        },
        {
          "id": "o2",
          "text": "Chia địa bàn thành các khu biệt lập để từng tộc người tự quản lý các dịch vụ thiết yếu."
        },
        {
          "id": "o3",
          "text": "Áp dụng phong tục của cộng đồng đông dân nhất làm chuẩn sinh hoạt cho cả địa bàn."
        },
        {
          "id": "o4",
          "text": "Chỉ đầu tư cho cộng đồng có dân số lớn để tạo hiệu quả lan tỏa thay cho hỗ trợ nhóm khác."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Xen cư tạo cơ hội giao lưu nhưng cần phối hợp lợi ích và tôn trọng khác biệt trong không gian chung.",
      "sourceRef": "Mục 3.1, trang 12."
    },
    {
      "id": "mln-010",
      "difficulty": 2,
      "topic": "Hai xu hướng quan hệ dân tộc",
      "prompt": "Nhận định nào đúng về quan hệ giữa xu hướng khẳng định tính độc lập và xu hướng liên hiệp giữa các dân tộc?",
      "options": [
        {
          "id": "o1",
          "text": "Hai xu hướng lần lượt thay thế nhau: kết thúc độc lập mới bắt đầu hợp tác."
        },
        {
          "id": "o2",
          "text": "Hai xu hướng loại trừ nhau: tăng hợp tác đồng nghĩa giảm quyền tự chủ."
        },
        {
          "id": "o3",
          "text": "Hai xu hướng có thể hỗ trợ nhau trên cơ sở bình đẳng, tôn trọng và tự nguyện."
        },
        {
          "id": "o4",
          "text": "Hai xu hướng chỉ thống nhất khi các bên có cùng ngôn ngữ và bản sắc văn hóa."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Độc lập tạo vị thế cho hợp tác bình đẳng; hợp tác phù hợp có thể hỗ trợ phát triển và bảo vệ lợi ích chính đáng.",
      "sourceRef": "Mục 2.1, trang 7–9."
    },
    {
      "id": "mln-011",
      "difficulty": 3,
      "topic": "Bình đẳng và mức hỗ trợ",
      "prompt": "Hai xã có cùng số dân nhưng một xã xa trường học, đường sá khó khăn hơn. Tăng hỗ trợ tiếp cận giáo dục cho xã khó khăn phù hợp với bình đẳng dân tộc vì sao?",
      "options": [
        {
          "id": "o1",
          "text": "Bình đẳng cho phép cộng đồng khó khăn có địa vị pháp lý cao hơn cộng đồng khác."
        },
        {
          "id": "o2",
          "text": "Mức hỗ trợ khác nhau có thể thay thế việc bảo đảm quyền công dân ngang nhau."
        },
        {
          "id": "o3",
          "text": "Bình đẳng được đo bằng mức tiền hỗ trợ, không cần xét cơ hội tiếp cận dịch vụ."
        },
        {
          "id": "o4",
          "text": "Hỗ trợ theo trở ngại thực tế giúp các cộng đồng có cơ hội thực hiện quyền bình đẳng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Khác biệt trong hỗ trợ để giảm rào cản không đồng nghĩa trao đặc quyền về địa vị pháp lý.",
      "sourceRef": "Mục 2.2 và 3.1, trang 9–10 và 12."
    },
    {
      "id": "mln-012",
      "difficulty": 3,
      "topic": "Bảo tồn và giao lưu văn hóa",
      "prompt": "Một địa phương vừa hỗ trợ truyền dạy tiếng mẹ đẻ, vừa tạo cơ hội giao lưu văn hóa với các cộng đồng khác. Cách làm này thể hiện điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Bảo tồn bản sắc chỉ có thể đạt được nếu hạn chế các giá trị văn hóa từ bên ngoài."
        },
        {
          "id": "o2",
          "text": "Giữ gìn bản sắc có thể kết hợp với giao lưu và tiếp thu có chọn lọc những giá trị tiến bộ."
        },
        {
          "id": "o3",
          "text": "Giao lưu là bước chuyển để thay văn hóa tộc người bằng một mô hình văn hóa chung."
        },
        {
          "id": "o4",
          "text": "Bảo tồn chỉ cần duy trì các hoạt động biểu diễn, không cần sử dụng ngôn ngữ trong đời sống."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Bảo tồn không đồng nghĩa khép kín; văn hóa được duy trì và phát triển trong sự tham gia của cộng đồng.",
      "sourceRef": "Mục 1.3, 3.1 và 3.3, trang 6, 13 và 15."
    },
    {
      "id": "mln-013",
      "difficulty": 3,
      "topic": "Địa bàn chiến lược",
      "prompt": "Một huyện biên giới có đông đồng bào dân tộc thiểu số cần phát triển bền vững. Định hướng nào phù hợp với báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Gắn cải thiện sinh kế, dịch vụ và sự tham gia của người dân với củng cố quốc phòng – an ninh."
        },
        {
          "id": "o2",
          "text": "Ưu tiên quốc phòng trong một chương trình riêng, đợi ổn định hoàn toàn mới cải thiện đời sống."
        },
        {
          "id": "o3",
          "text": "Chỉ tập trung tăng thu nhập vì thu nhập tăng sẽ tự giải quyết mọi vấn đề văn hóa và an ninh."
        },
        {
          "id": "o4",
          "text": "Đầu tư hạ tầng thay cho sự tham gia của cộng đồng vì địa bàn đã có cơ quan quản lý chuyên trách."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Phát triển và bảo vệ địa bàn cần kết hợp; đời sống và vai trò chủ thể của người dân là nền tảng xã hội quan trọng.",
      "sourceRef": "Mục 3.1, 3.3 và 3.4, trang 12 và 16–17."
    },
    {
      "id": "mln-014",
      "difficulty": 3,
      "topic": "Phạm vi quyền dân tộc tự quyết",
      "prompt": "Từ quyền dân tộc tự quyết, có người suy ra rằng mỗi tộc người thiểu số đương nhiên phải có một nhà nước riêng. Lập luận này sai ở điểm nào?",
      "options": [
        {
          "id": "o1",
          "text": "Quyền tự quyết chỉ nói về quyền duy trì lễ hội và phong tục, không liên quan con đường phát triển."
        },
        {
          "id": "o2",
          "text": "Quyền tự quyết chỉ thừa nhận khả năng liên hiệp, không thừa nhận quyền độc lập của dân tộc bị áp bức."
        },
        {
          "id": "o3",
          "text": "Quyền tự quyết phụ thuộc quy mô dân số, chỉ cộng đồng đông người mới có tư cách quyết định."
        },
        {
          "id": "o4",
          "text": "Lập luận đồng nhất quyền dân tộc tự quyết ở cấp độ dân tộc – quốc gia với yêu sách lập nước của từng tộc người."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Báo cáo yêu cầu phân biệt hai cấp độ và xem xét hoàn cảnh lịch sử cụ thể khi vận dụng.",
      "sourceRef": "Mục 2.2, trang 10–11."
    },
    {
      "id": "mln-015",
      "difficulty": 3,
      "topic": "Liên hiệp công nhân các dân tộc",
      "prompt": "Người lao động thuộc nhiều dân tộc phối hợp bảo vệ lợi ích lao động chung và tôn trọng ngôn ngữ, văn hóa của nhau. Điều này phù hợp nội dung nào?",
      "options": [
        {
          "id": "o1",
          "text": "Đoàn kết đòi hỏi người lao động dùng một bản sắc chung thay cho bản sắc dân tộc."
        },
        {
          "id": "o2",
          "text": "Hợp tác chỉ bền vững sau khi các dân tộc đạt cùng một trình độ phát triển kinh tế."
        },
        {
          "id": "o3",
          "text": "Liên hiệp công nhân dựa trên lợi ích chung, gắn với tôn trọng quyền dân tộc chính đáng."
        },
        {
          "id": "o4",
          "text": "Liên hiệp công nhân là việc các chính phủ lập một cơ quan quản lý thống nhất về lãnh thổ."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Đoàn kết của người lao động vượt qua khác biệt dân tộc nhưng không phủ nhận bản sắc hoặc quyền dân tộc.",
      "sourceRef": "Mục 2.2, trang 10–11."
    },
    {
      "id": "mln-016",
      "difficulty": 4,
      "topic": "Bình đẳng pháp lý và thực tế",
      "prompt": "Một báo cáo kết luận: “Các dân tộc đã có quyền ngang nhau trong văn bản nên không cần xem xét chênh lệch tiếp cận giáo dục.” Phê bình nào đúng trọng tâm nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Báo cáo sai vì quyền pháp lý không có vai trò trong thực hiện bình đẳng dân tộc."
        },
        {
          "id": "o2",
          "text": "Báo cáo đánh đồng ghi nhận quyền với điều kiện thực tế để các cộng đồng thực hiện quyền."
        },
        {
          "id": "o3",
          "text": "Báo cáo chỉ cần bổ sung số dân, vì địa vị bình đẳng phải xác định theo quy mô cộng đồng."
        },
        {
          "id": "o4",
          "text": "Báo cáo cần thay tiêu chí tiếp cận bằng tiêu chí mọi địa phương nhận cùng số tiền hỗ trợ."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Ghi nhận pháp lý cần đi cùng việc giảm các rào cản thực tế; không phủ nhận vai trò của pháp luật.",
      "sourceRef": "Mục 2.2, 3.1 và 3.3, trang 9–10, 12 và 15–16."
    },
    {
      "id": "mln-017",
      "difficulty": 4,
      "topic": "Đánh giá bảo tồn bản sắc",
      "prompt": "Một chương trình tăng số buổi biểu diễn văn hóa nhưng người dân ít được tham gia quyết định, tiếng mẹ đẻ cũng ít được truyền dạy. Nhận xét nào thuyết phục nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Số buổi tăng đã chứng minh bản sắc được bảo tồn, vì trình diễn thay thế được thực hành trong đời sống."
        },
        {
          "id": "o2",
          "text": "Vấn đề chính là cần giữ nguyên mọi tập quán cũ; quyền tham gia không ảnh hưởng hiệu quả bảo tồn."
        },
        {
          "id": "o3",
          "text": "Chương trình nên giảm giao lưu với bên ngoài, vì giao lưu là nguyên nhân duy nhất làm tiếng mẹ đẻ mai một."
        },
        {
          "id": "o4",
          "text": "Chỉ tiêu biểu diễn chưa đủ; cần xét sự truyền nối ngôn ngữ, thực hành văn hóa và vai trò chủ thể của cộng đồng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Báo cáo xem bản sắc là giá trị sống của cộng đồng; không thể chỉ đánh giá qua hoạt động giới thiệu, trình diễn.",
      "sourceRef": "Mục 3.1 và 3.3, trang 13 và 15."
    },
    {
      "id": "mln-018",
      "difficulty": 4,
      "topic": "Suy luận từ tiếng nói đến nhà nước",
      "prompt": "Một nhóm lập luận: “Có tiếng nói và văn hóa riêng thì phải có chủ quyền quốc gia riêng.” Sai sót cốt lõi là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Dùng dấu hiệu của cộng đồng tộc người để suy ra tư cách dân tộc – quốc gia và nhà nước riêng."
        },
        {
          "id": "o2",
          "text": "Chưa bổ sung điều kiện cộng đồng đó có số dân lớn hơn các cộng đồng sống cùng địa bàn."
        },
        {
          "id": "o3",
          "text": "Chưa chứng minh cộng đồng đó đã có thị trường riêng, vì thị trường riêng tự động tạo chủ quyền."
        },
        {
          "id": "o4",
          "text": "Dùng hai tiêu chí thay vì một tiêu chí, trong khi chỉ tiếng nói đã đủ xác lập một quốc gia."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Ngôn ngữ, văn hóa riêng không tự động làm phát sinh nhà nước hay chủ quyền riêng cho từng tộc người.",
      "sourceRef": "Mục 1.3, 1.4 và 2.2, trang 6–7 và 10."
    },
    {
      "id": "mln-019",
      "difficulty": 4,
      "topic": "Hai xu hướng trong cùng một quá trình",
      "prompt": "Một dân tộc giành độc lập, sau đó tự nguyện hợp tác kinh tế với các quốc gia khác và tiếp tục giữ bản sắc. Cách giải thích nào đúng nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Hợp tác cho thấy xu hướng độc lập đã mất tác dụng và bị xu hướng liên hiệp thay thế."
        },
        {
          "id": "o2",
          "text": "Giữ bản sắc cho thấy sự hợp tác chỉ mang tính hình thức, chưa phải biểu hiện liên hiệp."
        },
        {
          "id": "o3",
          "text": "Độc lập và hợp tác có thể hỗ trợ nhau: quyền làm chủ tạo vị thế tham gia liên kết tự nguyện."
        },
        {
          "id": "o4",
          "text": "Hai xu hướng chỉ tương thích nếu hợp tác dần chuyển thành một nhà nước chung giữa các bên."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Đây là quan hệ có thể bổ sung, không bắt buộc dẫn đến thay thế, đồng hóa hoặc hợp nhất nhà nước.",
      "sourceRef": "Mục 2.1, trang 8–9."
    },
    {
      "id": "mln-020",
      "difficulty": 4,
      "topic": "Phát triển đồng bộ",
      "prompt": "Một xã đã có đường mới nhưng người dân vẫn thiếu kỹ năng nghề và khó tiếp cận y tế. Lựa chọn nào phù hợp nhất với cách tiếp cận chính sách dân tộc trong báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Tiếp tục dùng số kilômét đường làm tiêu chí chính, chờ lợi ích tự lan sang giáo dục và y tế."
        },
        {
          "id": "o2",
          "text": "Kết nối hạ tầng với đào tạo, sinh kế và dịch vụ thiết yếu, có sự tham gia của cộng đồng."
        },
        {
          "id": "o3",
          "text": "Chuyển sang hỗ trợ tiền mặt thay các dịch vụ, vì thu nhập tăng sẽ tự xử lý rào cản tiếp cận."
        },
        {
          "id": "o4",
          "text": "Giao riêng cơ quan giao thông xử lý toàn bộ vấn đề, vì đầu tư đường đã là giải pháp trung tâm."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Các lĩnh vực tác động lẫn nhau; một chỉ tiêu hạ tầng không thay thế được tiếp cận liên ngành.",
      "sourceRef": "Mục 3.2 và 3.3, trang 14–16."
    },
    {
      "id": "mln-021",
      "difficulty": 5,
      "topic": "Kết hợp bình đẳng, bản sắc và tự quyết",
      "prompt": "Xét ba nhận định: (1) Hỗ trợ theo mức khó khăn có thể góp phần thực hiện bình đẳng; (2) Tôn trọng tự quyết nghĩa là mỗi tộc người phải lập nhà nước; (3) Giao lưu có thể kết hợp giữ bản sắc. Những nhận định nào phù hợp báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "(1) và (2)."
        },
        {
          "id": "o2",
          "text": "(2) và (3)."
        },
        {
          "id": "o3",
          "text": "(1) và (3)."
        },
        {
          "id": "o4",
          "text": "Cả (1), (2) và (3)."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(2) nhầm cấp độ tộc người với dân tộc – quốc gia; (1) và (3) phù hợp bình đẳng thực chất và thống nhất trong đa dạng.",
      "sourceRef": "Mục 2.2, 3.1 và 3.3, trang 10, 12–13 và 15."
    },
    {
      "id": "mln-022",
      "difficulty": 5,
      "topic": "Thống nhất quốc gia và đa dạng tộc người",
      "prompt": "Một địa phương muốn tăng kết nối quốc gia nhưng lo việc dùng ngôn ngữ chung làm mất bản sắc. Phương án nào giải quyết đúng đồng thời hai yêu cầu?",
      "options": [
        {
          "id": "o1",
          "text": "Bảo đảm giao tiếp chung, hỗ trợ truyền dạy tiếng mẹ đẻ và tăng sự tham gia của các cộng đồng."
        },
        {
          "id": "o2",
          "text": "Dùng tiếng chung cho mọi sinh hoạt cộng đồng, lưu tiếng mẹ đẻ trong tư liệu để thay thực hành."
        },
        {
          "id": "o3",
          "text": "Tách hoạt động giáo dục theo tộc người, giảm giao lưu để duy trì bản sắc và quyền tự quyết."
        },
        {
          "id": "o4",
          "text": "Chỉ mở giao lưu khi các cộng đồng có cùng trình độ kinh tế và thống nhất phong tục sinh hoạt."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Sự thống nhất không đòi hỏi đồng nhất; tiếng nói riêng, giao tiếp chung và sự tham gia có thể bổ sung nhau.",
      "sourceRef": "Mục 1.2, 1.4 và 3.3, trang 5–7 và 15."
    },
    {
      "id": "mln-023",
      "difficulty": 5,
      "topic": "Chọn hệ chỉ báo đánh giá",
      "prompt": "Để đánh giá toàn diện chính sách tại vùng đa tộc người, bộ chỉ báo nào phù hợp nhất với báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Tăng thu nhập, tăng đầu tư và tăng doanh thu; xem đây là bằng chứng thay thế cho kết quả xã hội, văn hóa."
        },
        {
          "id": "o2",
          "text": "Số công trình, số tiền giải ngân và số văn bản; xem hoàn thành đầu vào là hoàn thành mục tiêu chính sách."
        },
        {
          "id": "o3",
          "text": "Số lễ hội, số buổi biểu diễn và số khách; xem quảng bá văn hóa là tiêu chí đại diện cho đời sống cộng đồng."
        },
        {
          "id": "o4",
          "text": "Sinh kế, tiếp cận dịch vụ, quyền tham gia, truyền nối văn hóa và sự ổn định, đoàn kết của cộng đồng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Hiệu quả chính sách cần kết quả nhiều mặt; đầu vào, tăng trưởng hoặc trình diễn văn hóa riêng lẻ đều chưa đủ.",
      "sourceRef": "Mục 3.3 và 3.4, trang 15–17."
    },
    {
      "id": "mln-024",
      "difficulty": 5,
      "topic": "Quan hệ ba nội dung Cương lĩnh",
      "prompt": "Phương án nào giải thích đúng sự gắn bó giữa bình đẳng dân tộc, quyền tự quyết và liên hiệp công nhân các dân tộc?",
      "options": [
        {
          "id": "o1",
          "text": "Bình đẳng bảo đảm cùng mức phát triển; tự quyết tách các cộng đồng; liên hiệp thực hiện sau khi hoàn tất hai bước đó."
        },
        {
          "id": "o2",
          "text": "Bình đẳng xác lập nguyên tắc quan hệ; tự quyết khẳng định quyền chủ thể; liên hiệp tạo sức mạnh đoàn kết chống áp bức."
        },
        {
          "id": "o3",
          "text": "Bình đẳng tạo quyền pháp lý; tự quyết giao quyền cho dân tộc đông người; liên hiệp bảo đảm sự phục tùng của nhóm ít người."
        },
        {
          "id": "o4",
          "text": "Bình đẳng thuộc kinh tế; tự quyết thuộc văn hóa; liên hiệp thuộc chính trị, nên ba nội dung được giải quyết độc lập."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Ba nội dung là một chỉnh thể; không quy thành các giai đoạn tách rời, cơ chế áp đặt hoặc ba lĩnh vực độc lập.",
      "sourceRef": "Mục 2.2, trang 9–11."
    },
    {
      "id": "mln-025",
      "difficulty": 5,
      "topic": "Đánh giá gói giải pháp",
      "prompt": "Một huyện biên giới cần đồng thời giảm rào cản sinh kế, giữ tiếng mẹ đẻ, tăng quyền tham gia và ổn định địa bàn. Gói giải pháp nào đáp ứng đầy đủ bốn yêu cầu?",
      "options": [
        {
          "id": "o1",
          "text": "Tập trung đường và việc làm; dùng tăng thu nhập thay chỉ tiêu văn hóa, tham gia và ổn định cộng đồng."
        },
        {
          "id": "o2",
          "text": "Tăng trợ cấp và lễ hội; giao đơn vị triển khai quyết định thay người dân để rút ngắn thời gian thực hiện."
        },
        {
          "id": "o3",
          "text": "Kết hợp hạ tầng, đào tạo nghề, truyền dạy ngôn ngữ, tham vấn cộng đồng và phối hợp bảo vệ địa bàn."
        },
        {
          "id": "o4",
          "text": "Tăng tuần tra và công trình biểu tượng; hoãn đào tạo, dịch vụ và bảo tồn đến khi địa bàn ổn định hơn."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Gói này kết hợp phát triển, văn hóa, vai trò chủ thể và quốc phòng – an ninh; các phương án khác bỏ hoặc thay thế một số mục tiêu.",
      "sourceRef": "Mục 3.2–3.4, trang 14–17."
    },
    {
      "id": "mln-026",
      "difficulty": 1,
      "topic": "Các hình thức cộng đồng",
      "prompt": "Trình tự nào thể hiện các hình thức cộng đồng người trong tiến trình lịch sử được báo cáo trình bày?",
      "options": [
        {
          "id": "o1",
          "text": "Thị tộc → bộ lạc → bộ tộc → dân tộc."
        },
        {
          "id": "o2",
          "text": "Bộ lạc → thị tộc → dân tộc → bộ tộc."
        },
        {
          "id": "o3",
          "text": "Bộ tộc → dân tộc → thị tộc → bộ lạc."
        },
        {
          "id": "o4",
          "text": "Thị tộc → dân tộc → bộ lạc → bộ tộc."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Báo cáo trình bày sự vận động từ thị tộc, bộ lạc, bộ tộc đến dân tộc.",
      "sourceRef": "Mục 1.1, trang 3."
    },
    {
      "id": "mln-027",
      "difficulty": 1,
      "topic": "Phương thức sản xuất",
      "prompt": "Yếu tố nào có tính quyết định đối với sự biến đổi các hình thức cộng đồng người theo nội dung báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Sự thay đổi trang phục truyền thống."
        },
        {
          "id": "o2",
          "text": "Sự biến đổi của phương thức sản xuất."
        },
        {
          "id": "o3",
          "text": "Sự thống nhất các nghi lễ cộng đồng."
        },
        {
          "id": "o4",
          "text": "Sự gia tăng dân số tại một địa phương."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Biến đổi phương thức sản xuất có vai trò quyết định; các dấu hiệu văn hóa hoặc dân số riêng lẻ không thay thế vai trò đó.",
      "sourceRef": "Mục 1.1, trang 3."
    },
    {
      "id": "mln-028",
      "difficulty": 1,
      "topic": "Hình thành dân tộc phương Tây",
      "prompt": "Ở phương Tây, sự hình thành dân tộc gắn với quá trình nào?",
      "options": [
        {
          "id": "o1",
          "text": "Khôi phục quan hệ huyết thống của các thị tộc."
        },
        {
          "id": "o2",
          "text": "Tách thị trường thành những lãnh địa phong kiến riêng."
        },
        {
          "id": "o3",
          "text": "Xác lập phương thức sản xuất tư bản chủ nghĩa."
        },
        {
          "id": "o4",
          "text": "Giảm trao đổi giữa các cộng đồng dân cư."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Sản xuất hàng hóa, thị trường và sự thay thế quan hệ phong kiến phân tán gắn với quá trình hình thành dân tộc ở phương Tây.",
      "sourceRef": "Mục 1.1, trang 3–4."
    },
    {
      "id": "mln-029",
      "difficulty": 1,
      "topic": "Hình thành dân tộc phương Đông",
      "prompt": "Theo báo cáo, yếu tố nào có thể gắn kết cộng đồng ở một số xã hội phương Đông từ tương đối sớm?",
      "options": [
        {
          "id": "o1",
          "text": "Một thị trường tư bản đã hoàn chỉnh."
        },
        {
          "id": "o2",
          "text": "Một cơ cấu nghề nghiệp thống nhất giữa mọi vùng."
        },
        {
          "id": "o3",
          "text": "Một trình độ thu nhập ngang nhau giữa cư dân."
        },
        {
          "id": "o4",
          "text": "Lịch sử, văn hóa chung và yêu cầu bảo vệ lãnh thổ."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Ở một số xã hội phương Đông, yếu tố lịch sử, văn hóa và yêu cầu bảo vệ lãnh thổ có vai trò gắn kết sớm.",
      "sourceRef": "Mục 1.1, trang 3–4."
    },
    {
      "id": "mln-030",
      "difficulty": 1,
      "topic": "Lãnh thổ",
      "prompt": "Trong các đặc trưng dân tộc – quốc gia, lãnh thổ trước hết xác định điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Không gian sinh tồn và cơ sở không gian của chủ quyền."
        },
        {
          "id": "o2",
          "text": "Một hệ thống phong tục thống nhất cho mọi cộng đồng."
        },
        {
          "id": "o3",
          "text": "Một tiếng mẹ đẻ chung cho toàn bộ công dân."
        },
        {
          "id": "o4",
          "text": "Một mức phát triển kinh tế chung cho mọi địa phương."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Lãnh thổ có ý nghĩa địa lý, lịch sử và chính trị, là không gian sinh tồn và cơ sở của chủ quyền.",
      "sourceRef": "Mục 1.2, trang 4."
    },
    {
      "id": "mln-031",
      "difficulty": 1,
      "topic": "Liên kết vật chất",
      "prompt": "Đặc trưng nào trực tiếp tạo nền tảng gắn kết về lợi ích vật chất giữa các bộ phận dân cư?",
      "options": [
        {
          "id": "o1",
          "text": "Ký ức về lễ hội."
        },
        {
          "id": "o2",
          "text": "Quan hệ kinh tế thống nhất."
        },
        {
          "id": "o3",
          "text": "Sự tương đồng trang phục."
        },
        {
          "id": "o4",
          "text": "Tên gọi của từng tộc người."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Quan hệ sản xuất, phân công lao động và trao đổi tạo sự gắn kết vật chất.",
      "sourceRef": "Mục 1.2, trang 4."
    },
    {
      "id": "mln-032",
      "difficulty": 1,
      "topic": "Chức năng ngôn ngữ chung",
      "prompt": "Chức năng chủ yếu của ngôn ngữ giao tiếp chung trong quốc gia đa tộc người là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Thay thế tiếng mẹ đẻ của các tộc người."
        },
        {
          "id": "o2",
          "text": "Xác định quyền lợi theo nhóm ngôn ngữ."
        },
        {
          "id": "o3",
          "text": "Kết nối cư dân trong hoạt động xã hội chung."
        },
        {
          "id": "o4",
          "text": "Làm căn cứ chia chủ quyền cho từng cộng đồng."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Ngôn ngữ chung giúp liên thông hành chính, giáo dục, kinh tế và giao tiếp, không đòi hỏi xóa tiếng mẹ đẻ.",
      "sourceRef": "Mục 1.2, trang 5."
    },
    {
      "id": "mln-033",
      "difficulty": 1,
      "topic": "Văn hóa quốc gia",
      "prompt": "Văn hóa chung của dân tộc – quốc gia được tích lũy chủ yếu qua điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Việc cư dân có cùng một nghề nghiệp."
        },
        {
          "id": "o2",
          "text": "Việc các địa phương có cùng mức thu nhập."
        },
        {
          "id": "o3",
          "text": "Việc mọi tộc người có cùng tiếng mẹ đẻ."
        },
        {
          "id": "o4",
          "text": "Lịch sử chung, hệ giá trị và ký ức cộng đồng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Văn hóa và tâm lý cộng đồng gắn với những trải nghiệm, giá trị và ký ức được tích lũy trong lịch sử.",
      "sourceRef": "Mục 1.2, trang 5."
    },
    {
      "id": "mln-034",
      "difficulty": 1,
      "topic": "Ba tiêu chí tộc người",
      "prompt": "Bộ tiêu chí nào được dùng để nhận diện dân tộc theo nghĩa tộc người?",
      "options": [
        {
          "id": "o1",
          "text": "Ngôn ngữ, văn hóa và ý thức tự giác tộc người."
        },
        {
          "id": "o2",
          "text": "Lãnh thổ, nhà nước và thị trường độc lập."
        },
        {
          "id": "o3",
          "text": "Quốc tịch, thu nhập và nghề nghiệp."
        },
        {
          "id": "o4",
          "text": "Dân số, địa giới hành chính và tín ngưỡng."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Báo cáo nêu ba tiêu chí: cộng đồng ngôn ngữ, văn hóa và ý thức tự giác tộc người.",
      "sourceRef": "Mục 1.3, trang 6–7."
    },
    {
      "id": "mln-035",
      "difficulty": 1,
      "topic": "Tiếng nói và chữ viết",
      "prompt": "Ngôn ngữ tộc người có thể tồn tại dưới hình thức nào theo báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Chỉ được công nhận khi có chữ viết riêng."
        },
        {
          "id": "o2",
          "text": "Có tiếng nói và chữ viết, hoặc chỉ tiếng nói."
        },
        {
          "id": "o3",
          "text": "Chỉ được công nhận khi là ngôn ngữ hành chính."
        },
        {
          "id": "o4",
          "text": "Phải khác mọi ngôn ngữ của cộng đồng lân cận."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Có cộng đồng chỉ có tiếng nói; chữ viết riêng không phải điều kiện bắt buộc cho mọi tộc người.",
      "sourceRef": "Mục 1.3, trang 6."
    },
    {
      "id": "mln-036",
      "difficulty": 1,
      "topic": "Tự giác tộc người",
      "prompt": "Ý thức tự giác tộc người trực tiếp nói đến điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Khả năng tự cung cấp hàng hóa của cộng đồng."
        },
        {
          "id": "o2",
          "text": "Quyền quản lý một đơn vị hành chính riêng."
        },
        {
          "id": "o3",
          "text": "Sự tự nhận thức về nguồn gốc và sự thuộc về cộng đồng."
        },
        {
          "id": "o4",
          "text": "Khả năng không tiếp nhận văn hóa từ cộng đồng khác."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Đây là ý thức tự nhận, tự khẳng định tên gọi, nguồn gốc và sự gắn bó với cộng đồng tộc người.",
      "sourceRef": "Mục 1.3, trang 6–7."
    },
    {
      "id": "mln-037",
      "difficulty": 1,
      "topic": "Dân tộc đa số",
      "prompt": "Theo báo cáo, tộc người nào là tộc người đa số tại Việt Nam?",
      "options": [
        {
          "id": "o1",
          "text": "Tày."
        },
        {
          "id": "o2",
          "text": "Thái."
        },
        {
          "id": "o3",
          "text": "Khmer."
        },
        {
          "id": "o4",
          "text": "Kinh."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Báo cáo xác định dân tộc Kinh là tộc người đa số trong cộng đồng 54 tộc người.",
      "sourceRef": "Mục 1.3 và 3.1, trang 6 và 11."
    },
    {
      "id": "mln-038",
      "difficulty": 1,
      "topic": "Đặc điểm cư trú",
      "prompt": "Đặc điểm nào mô tả cách cư trú của các tộc người ở Việt Nam?",
      "options": [
        {
          "id": "o1",
          "text": "Các tộc người cư trú xen kẽ ở nhiều địa phương."
        },
        {
          "id": "o2",
          "text": "Mỗi tộc người cư trú trong một tỉnh riêng."
        },
        {
          "id": "o3",
          "text": "Các tộc người chủ yếu sống biệt lập về kinh tế."
        },
        {
          "id": "o4",
          "text": "Ranh giới tộc người trùng với ranh giới hành chính."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Cư trú xen kẽ là một trong sáu đặc điểm được báo cáo nêu, tạo điều kiện giao lưu và phối hợp lợi ích.",
      "sourceRef": "Mục 3.1, trang 12."
    },
    {
      "id": "mln-039",
      "difficulty": 1,
      "topic": "Địa bàn chiến lược",
      "prompt": "Nhiều vùng cư trú của đồng bào dân tộc thiểu số có đặc điểm vị trí nào?",
      "options": [
        {
          "id": "o1",
          "text": "Chủ yếu là trung tâm tài chính lớn."
        },
        {
          "id": "o2",
          "text": "Miền núi, biên giới và các địa bàn có ý nghĩa chiến lược."
        },
        {
          "id": "o3",
          "text": "Chủ yếu nằm trong các khu công nghiệp ven đô."
        },
        {
          "id": "o4",
          "text": "Đều có điều kiện giao thông và dịch vụ thuận lợi."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Báo cáo nhấn mạnh nhiều địa bàn miền núi, biên giới, vùng sâu có ý nghĩa về sinh thái và quốc phòng – an ninh.",
      "sourceRef": "Mục 3.1, trang 12."
    },
    {
      "id": "mln-040",
      "difficulty": 1,
      "topic": "Trình độ phát triển",
      "prompt": "Nhận định nào là một đặc điểm của các dân tộc Việt Nam trong báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Các cộng đồng có cùng khả năng tiếp cận dịch vụ."
        },
        {
          "id": "o2",
          "text": "Các cộng đồng đã đạt cùng trình độ phát triển."
        },
        {
          "id": "o3",
          "text": "Trình độ phát triển giữa các dân tộc chưa đồng đều."
        },
        {
          "id": "o4",
          "text": "Chênh lệch phát triển chỉ thể hiện ở quy mô dân số."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Khác biệt lịch sử, tự nhiên và tiếp cận nguồn lực tạo nên sự phát triển chưa đồng đều.",
      "sourceRef": "Mục 3.1, trang 12."
    },
    {
      "id": "mln-041",
      "difficulty": 1,
      "topic": "Nguồn gốc đoàn kết",
      "prompt": "Truyền thống đoàn kết giữa các dân tộc Việt Nam được hình thành qua quá trình nào?",
      "options": [
        {
          "id": "o1",
          "text": "Thống nhất phong tục giữa mọi vùng."
        },
        {
          "id": "o2",
          "text": "Phân chia riêng không gian sống cho từng tộc người."
        },
        {
          "id": "o3",
          "text": "Đạt cùng mức phát triển trong cùng thời điểm."
        },
        {
          "id": "o4",
          "text": "Chung sống, lao động và đấu tranh bảo vệ đất nước."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Lịch sử hợp tác sản xuất, chống thiên tai và bảo vệ Tổ quốc là nền tảng của truyền thống đoàn kết.",
      "sourceRef": "Mục 3.1, trang 12–13."
    },
    {
      "id": "mln-042",
      "difficulty": 1,
      "topic": "Bản sắc riêng",
      "prompt": "Nhận định nào đúng về văn hóa của các tộc người ở Việt Nam?",
      "options": [
        {
          "id": "o1",
          "text": "Mỗi tộc người có bản sắc riêng, góp vào văn hóa chung."
        },
        {
          "id": "o2",
          "text": "Bản sắc riêng được xác định theo địa vị pháp lý cao thấp."
        },
        {
          "id": "o3",
          "text": "Mọi tộc người có cùng phong tục để bảo đảm thống nhất."
        },
        {
          "id": "o4",
          "text": "Bản sắc riêng chỉ thể hiện ở trang phục và nhà ở."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Ngôn ngữ, phong tục, nghệ thuật và tri thức của các tộc người làm phong phú văn hóa Việt Nam.",
      "sourceRef": "Mục 3.1, trang 13."
    },
    {
      "id": "mln-043",
      "difficulty": 1,
      "topic": "Xu hướng độc lập",
      "prompt": "Phong trào chống chủ nghĩa thực dân, giành độc lập dân tộc thể hiện rõ xu hướng nào?",
      "options": [
        {
          "id": "o1",
          "text": "Liên hiệp thành một thị trường chung."
        },
        {
          "id": "o2",
          "text": "Tách ra để hình thành cộng đồng dân tộc độc lập."
        },
        {
          "id": "o3",
          "text": "Đồng nhất văn hóa giữa các cộng đồng."
        },
        {
          "id": "o4",
          "text": "Thay thế quyền tự chủ bằng quản lý từ bên ngoài."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Đấu tranh giải phóng khỏi áp bức, lệ thuộc là biểu hiện quốc tế quan trọng của xu hướng khẳng định độc lập.",
      "sourceRef": "Mục 2.1, trang 8."
    },
    {
      "id": "mln-044",
      "difficulty": 1,
      "topic": "Xu hướng liên hiệp",
      "prompt": "Hợp tác về thương mại, khoa học và giáo dục giữa các quốc gia thể hiện xu hướng nào?",
      "options": [
        {
          "id": "o1",
          "text": "Khôi phục cộng đồng dựa trên huyết thống."
        },
        {
          "id": "o2",
          "text": "Chia tách mọi hoạt động theo tộc người."
        },
        {
          "id": "o3",
          "text": "Liên hiệp, xích lại gần nhau giữa các dân tộc."
        },
        {
          "id": "o4",
          "text": "Thay thế nhà nước bằng cộng đồng nghề nghiệp."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Hợp tác và tăng liên hệ giữa các dân tộc là biểu hiện xu hướng liên hiệp.",
      "sourceRef": "Mục 2.1, trang 8–9."
    },
    {
      "id": "mln-045",
      "difficulty": 1,
      "topic": "Chủ thể công tác dân tộc",
      "prompt": "Theo quan điểm được báo cáo nêu, công tác dân tộc là trách nhiệm của ai?",
      "options": [
        {
          "id": "o1",
          "text": "Riêng cơ quan chuyên trách về dân tộc."
        },
        {
          "id": "o2",
          "text": "Riêng chính quyền ở địa phương miền núi."
        },
        {
          "id": "o3",
          "text": "Riêng các cộng đồng dân tộc thiểu số."
        },
        {
          "id": "o4",
          "text": "Toàn Đảng, toàn dân, toàn quân và cả hệ thống chính trị."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Công tác dân tộc có tính liên ngành, là trách nhiệm chung chứ không thuộc riêng một cơ quan hay cộng đồng.",
      "sourceRef": "Mục 3.2, trang 14."
    },
    {
      "id": "mln-046",
      "difficulty": 2,
      "topic": "Bình đẳng và dân số",
      "prompt": "Bình đẳng dân tộc được hiểu như thế nào khi các cộng đồng có số dân khác nhau?",
      "options": [
        {
          "id": "o1",
          "text": "Quyền và nghĩa vụ ngang nhau, không căn cứ đông hay ít người."
        },
        {
          "id": "o2",
          "text": "Quyền chính trị tăng tương ứng với số dân của cộng đồng."
        },
        {
          "id": "o3",
          "text": "Cộng đồng ít người được miễn mọi nghĩa vụ công dân."
        },
        {
          "id": "o4",
          "text": "Cộng đồng đông người có quyền đặt chuẩn văn hóa chung."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Quy mô dân số không quyết định địa vị pháp lý hoặc giá trị văn hóa của một dân tộc.",
      "sourceRef": "Mục 2.2 và 3.1, trang 10–11."
    },
    {
      "id": "mln-047",
      "difficulty": 2,
      "topic": "Nội dung tự quyết",
      "prompt": "Quyền dân tộc tự quyết chủ yếu khẳng định quyền nào?",
      "options": [
        {
          "id": "o1",
          "text": "Được có mức thu nhập ngang các dân tộc khác."
        },
        {
          "id": "o2",
          "text": "Tự định đoạt vận mệnh, lựa chọn chế độ và con đường phát triển."
        },
        {
          "id": "o3",
          "text": "Được miễn tham gia các hình thức hợp tác quốc tế."
        },
        {
          "id": "o4",
          "text": "Được yêu cầu các tộc người khác thay đổi phong tục."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Tự quyết xác nhận vai trò chủ thể đối với vận mệnh chính trị và con đường phát triển.",
      "sourceRef": "Mục 2.2, trang 10."
    },
    {
      "id": "mln-048",
      "difficulty": 2,
      "topic": "Đoàn kết và bản sắc",
      "prompt": "Liên hiệp công nhân tất cả các dân tộc có quan hệ thế nào với bản sắc dân tộc?",
      "options": [
        {
          "id": "o1",
          "text": "Đòi hỏi giảm quyền dân tộc để thống nhất lực lượng."
        },
        {
          "id": "o2",
          "text": "Chỉ thực hiện khi công nhân có chung tiếng mẹ đẻ."
        },
        {
          "id": "o3",
          "text": "Dựa trên lợi ích chung nhưng không phủ nhận bản sắc."
        },
        {
          "id": "o4",
          "text": "Thay chủ nghĩa yêu nước bằng một văn hóa đồng nhất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Lợi ích lao động chung tạo cơ sở đoàn kết đồng thời tôn trọng quyền dân tộc chính đáng.",
      "sourceRef": "Mục 2.2, trang 10–11."
    },
    {
      "id": "mln-049",
      "difficulty": 2,
      "topic": "Lâu dài và cấp bách",
      "prompt": "Vì sao báo cáo nêu vấn đề dân tộc vừa chiến lược, lâu dài vừa có ý nghĩa cấp bách?",
      "options": [
        {
          "id": "o1",
          "text": "Vì chỉ cần giải quyết khẩn cấp, sau đó chấm dứt chính sách."
        },
        {
          "id": "o2",
          "text": "Vì nhiệm vụ lâu dài cho phép hoãn mọi khó khăn trước mắt."
        },
        {
          "id": "o3",
          "text": "Vì chỉ các địa phương có xung đột mới cần công tác dân tộc."
        },
        {
          "id": "o4",
          "text": "Vì đoàn kết cần được củng cố bền vững và khó khăn cụ thể cần xử lý kịp thời."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Tính chiến lược không loại trừ yêu cầu giải quyết những vấn đề cụ thể cấp bách.",
      "sourceRef": "Mục 3.2, trang 14."
    },
    {
      "id": "mln-050",
      "difficulty": 2,
      "topic": "Phát triển toàn diện",
      "prompt": "Phát triển toàn diện vùng dân tộc thiểu số theo báo cáo bao gồm những lĩnh vực nào?",
      "options": [
        {
          "id": "o1",
          "text": "Chính trị, kinh tế, văn hóa, xã hội và quốc phòng – an ninh."
        },
        {
          "id": "o2",
          "text": "Kinh tế, thương mại và sản xuất; văn hóa được giải quyết sau."
        },
        {
          "id": "o3",
          "text": "Văn hóa, lễ hội và du lịch; dịch vụ xã hội là kết quả tự phát."
        },
        {
          "id": "o4",
          "text": "Hạ tầng và quốc phòng; quyền tham gia là nhiệm vụ ngoài chính sách."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Năm phương diện có quan hệ bổ sung và cần được phối hợp.",
      "sourceRef": "Mục 3.2–3.3, trang 14–16."
    },
    {
      "id": "mln-051",
      "difficulty": 2,
      "topic": "Kinh tế và xã hội",
      "prompt": "Đào tạo nghề kết hợp mở đường tới thị trường minh họa rõ điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Đào tạo và hạ tầng là hai giải pháp không tác động lẫn nhau."
        },
        {
          "id": "o2",
          "text": "Phát triển nhân lực và điều kiện kinh tế có thể hỗ trợ sinh kế."
        },
        {
          "id": "o3",
          "text": "Hạ tầng có thể thay thế hoàn toàn việc nâng cao kỹ năng."
        },
        {
          "id": "o4",
          "text": "Chính sách kinh tế chỉ cần tăng lượng vốn cấp cho địa phương."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Kỹ năng và khả năng tiếp cận thị trường cùng tạo điều kiện phát triển bằng nội lực.",
      "sourceRef": "Mục 3.3, trang 15."
    },
    {
      "id": "mln-052",
      "difficulty": 2,
      "topic": "Chính sách văn hóa",
      "prompt": "Hỗ trợ tiếng nói, chữ viết và nghệ thuật dân gian trực tiếp thuộc phương diện chính sách nào?",
      "options": [
        {
          "id": "o1",
          "text": "Quốc phòng – an ninh."
        },
        {
          "id": "o2",
          "text": "Quản lý dân số."
        },
        {
          "id": "o3",
          "text": "Văn hóa."
        },
        {
          "id": "o4",
          "text": "Phân phối thu nhập."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Đây là các nội dung bảo tồn và phát huy bản sắc văn hóa tộc người.",
      "sourceRef": "Mục 3.3, trang 15."
    },
    {
      "id": "mln-053",
      "difficulty": 2,
      "topic": "Chính sách chính trị",
      "prompt": "Nội dung nào thể hiện rõ phương diện chính trị của chính sách dân tộc?",
      "options": [
        {
          "id": "o1",
          "text": "Tăng diện tích cây trồng hàng hóa."
        },
        {
          "id": "o2",
          "text": "Phục dựng một không gian trình diễn lễ hội."
        },
        {
          "id": "o3",
          "text": "Mở thêm cơ sở khám chữa bệnh."
        },
        {
          "id": "o4",
          "text": "Bảo đảm quyền và sự tham gia vào công việc chung."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Tham gia thực chất vào đời sống chính trị – xã hội là trọng tâm của phương diện chính trị.",
      "sourceRef": "Mục 3.3, trang 15."
    },
    {
      "id": "mln-054",
      "difficulty": 2,
      "topic": "Chính sách xã hội",
      "prompt": "Giải pháp nào trực tiếp thể hiện phương diện xã hội của chính sách dân tộc?",
      "options": [
        {
          "id": "o1",
          "text": "Cải thiện tiếp cận y tế, giáo dục và an sinh."
        },
        {
          "id": "o2",
          "text": "Thống nhất quy trình tuần tra biên giới."
        },
        {
          "id": "o3",
          "text": "Tổ chức trao đổi hàng hóa giữa các thị trường."
        },
        {
          "id": "o4",
          "text": "Sưu tầm các làn điệu nghệ thuật dân gian."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Dịch vụ thiết yếu và an sinh góp phần cải thiện chất lượng sống, cơ hội phát triển.",
      "sourceRef": "Mục 3.3, trang 15–16."
    },
    {
      "id": "mln-055",
      "difficulty": 2,
      "topic": "Quốc phòng và đời sống",
      "prompt": "Theo báo cáo, chăm lo đời sống cộng đồng có ý nghĩa gì đối với quốc phòng – an ninh?",
      "options": [
        {
          "id": "o1",
          "text": "Là nhiệm vụ được thực hiện sau khi kết thúc củng cố địa bàn."
        },
        {
          "id": "o2",
          "text": "Tạo nền tảng xã hội cho ổn định và bảo vệ lãnh thổ."
        },
        {
          "id": "o3",
          "text": "Chỉ có ý nghĩa kinh tế, không liên quan ổn định địa bàn."
        },
        {
          "id": "o4",
          "text": "Thay thế yêu cầu giữ vững chủ quyền và trật tự."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Đời sống, đoàn kết và vai trò người dân gắn với nền tảng xã hội của quốc phòng – an ninh.",
      "sourceRef": "Mục 3.3–3.4, trang 16–17."
    },
    {
      "id": "mln-056",
      "difficulty": 2,
      "topic": "Dân số và giá trị",
      "prompt": "Từ chênh lệch số dân giữa các tộc người, có thể rút ra nhận định nào?",
      "options": [
        {
          "id": "o1",
          "text": "Dân số ít đồng nghĩa giá trị văn hóa thấp hơn."
        },
        {
          "id": "o2",
          "text": "Dân số đông tạo quyền áp đặt lên cộng đồng khác."
        },
        {
          "id": "o3",
          "text": "Nhu cầu hỗ trợ có thể khác nhau nhưng địa vị bình đẳng không thay đổi."
        },
        {
          "id": "o4",
          "text": "Mọi cộng đồng cần cùng một mô hình tổ chức bảo tồn văn hóa."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Khác biệt số dân đặt ra nhu cầu chính sách khác nhau, không làm phát sinh thứ bậc giá trị hoặc quyền.",
      "sourceRef": "Mục 3.1, trang 11."
    },
    {
      "id": "mln-057",
      "difficulty": 2,
      "topic": "Văn hóa thống nhất",
      "prompt": "Cụm từ văn hóa Việt Nam “thống nhất trong đa dạng” nên được hiểu thế nào?",
      "options": [
        {
          "id": "o1",
          "text": "Nét riêng chỉ được giữ nếu không có giao lưu giữa các tộc người."
        },
        {
          "id": "o2",
          "text": "Thống nhất đạt được khi mọi cộng đồng dùng một phong tục chung."
        },
        {
          "id": "o3",
          "text": "Bản sắc riêng được lưu trong bảo tàng thay cho sinh hoạt đời thường."
        },
        {
          "id": "o4",
          "text": "Giá trị chung của quốc gia có thể cùng tồn tại với bản sắc các tộc người."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Sự gắn bó quốc gia không đòi hỏi xóa các nét riêng của cộng đồng thành phần.",
      "sourceRef": "Mục 1.4 và 3.1, trang 7 và 13."
    },
    {
      "id": "mln-058",
      "difficulty": 2,
      "topic": "Địa giới và tộc người",
      "prompt": "Vì sao không nên xác định tộc người chỉ từ tỉnh đang cư trú?",
      "options": [
        {
          "id": "o1",
          "text": "Cư trú xen kẽ và di cư khiến địa giới hành chính không trùng ranh giới tộc người."
        },
        {
          "id": "o2",
          "text": "Tộc người được xác định hoàn toàn theo nơi làm việc hiện tại."
        },
        {
          "id": "o3",
          "text": "Di chuyển sang tỉnh khác tự động làm thay đổi ý thức tộc người."
        },
        {
          "id": "o4",
          "text": "Mỗi tỉnh chỉ có một cộng đồng có văn hóa và tiếng nói riêng."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Cư trú là một yếu tố hoàn cảnh; cần kết hợp các dấu hiệu ngôn ngữ, văn hóa và ý thức tự giác.",
      "sourceRef": "Mục 1.3 và 3.1, trang 6–7 và 12."
    },
    {
      "id": "mln-059",
      "difficulty": 2,
      "topic": "Quan hệ chỉnh thể và thành phần",
      "prompt": "Dân tộc – quốc gia và dân tộc – tộc người có quan hệ như thế nào theo báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Là hai tên gọi thay thế được cho cùng một cấp độ cộng đồng."
        },
        {
          "id": "o2",
          "text": "Là cộng đồng quốc gia và các cộng đồng thành phần có bản sắc riêng."
        },
        {
          "id": "o3",
          "text": "Là hai cộng đồng tách biệt không chia sẻ lợi ích chính trị."
        },
        {
          "id": "o4",
          "text": "Là quan hệ trong đó mỗi tộc người phải có nhà nước riêng."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Nhiều tộc người góp phần cấu thành cộng đồng quốc gia mà vẫn giữ các nét lịch sử – văn hóa riêng.",
      "sourceRef": "Mục 1.4, trang 7."
    },
    {
      "id": "mln-060",
      "difficulty": 2,
      "topic": "Biến đổi văn hóa",
      "prompt": "Một cộng đồng tiếp nhận hình thức sinh hoạt mới. Kết luận nào phù hợp nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Tiếp nhận yếu tố mới chứng minh bản sắc đã mất."
        },
        {
          "id": "o2",
          "text": "Bản sắc chỉ còn nếu mọi tập quán được giữ nguyên."
        },
        {
          "id": "o3",
          "text": "Cần xem xét cách cộng đồng tiếp nhận và duy trì ý thức, giá trị riêng."
        },
        {
          "id": "o4",
          "text": "Cộng đồng phải ngừng giao lưu để khôi phục tư cách tộc người."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Văn hóa có tính phát triển; tiếp thu có chọn lọc không tự động xóa bản sắc.",
      "sourceRef": "Mục 1.3 và 3.1, trang 6 và 13."
    },
    {
      "id": "mln-061",
      "difficulty": 2,
      "topic": "Chỉnh thể đặc trưng",
      "prompt": "Vì sao không nên dùng một đặc trưng đơn lẻ để giải thích sự tồn tại của dân tộc – quốc gia?",
      "options": [
        {
          "id": "o1",
          "text": "Vì các đặc trưng không có chức năng riêng."
        },
        {
          "id": "o2",
          "text": "Vì chỉ nhà nước là đặc trưng có thể xem xét."
        },
        {
          "id": "o3",
          "text": "Vì chỉ lãnh thổ là căn cứ của mọi quan hệ cộng đồng."
        },
        {
          "id": "o4",
          "text": "Vì lãnh thổ, kinh tế, ngôn ngữ, văn hóa và nhà nước tác động qua lại."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Năm đặc trưng tạo một chỉnh thể; tuyệt đối hóa một yếu tố che khuất các liên hệ khác.",
      "sourceRef": "Mục 1.2, trang 4–6."
    },
    {
      "id": "mln-062",
      "difficulty": 2,
      "topic": "Khác biệt con đường lịch sử",
      "prompt": "Khác biệt giữa phương Đông và phương Tây trong hình thành dân tộc gợi ra yêu cầu phương pháp nào?",
      "options": [
        {
          "id": "o1",
          "text": "Xét điều kiện lịch sử cụ thể, tránh áp dụng một mô hình cho mọi dân tộc."
        },
        {
          "id": "o2",
          "text": "Chỉ dùng mô hình thị trường phương Tây vì có tính khái quát cao."
        },
        {
          "id": "o3",
          "text": "Chỉ dùng yếu tố văn hóa phương Đông vì kinh tế không quyết định."
        },
        {
          "id": "o4",
          "text": "Bỏ việc xem xét kinh tế khi cộng đồng có lịch sử chung."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Báo cáo phân biệt các con đường hình thành để tránh khuôn mẫu lịch sử duy nhất.",
      "sourceRef": "Mục 1.1, trang 3–4."
    },
    {
      "id": "mln-063",
      "difficulty": 2,
      "topic": "Cơ sở liên hiệp",
      "prompt": "Nhu cầu liên hiệp giữa các dân tộc có cơ sở vật chất quan trọng nào?",
      "options": [
        {
          "id": "o1",
          "text": "Các dân tộc dần có chung mọi phong tục."
        },
        {
          "id": "o2",
          "text": "Phát triển sản xuất, phân công lao động và mở rộng trao đổi."
        },
        {
          "id": "o3",
          "text": "Các dân tộc đều có cùng quy mô dân số."
        },
        {
          "id": "o4",
          "text": "Các quốc gia mất nhu cầu bảo vệ quyền tự chủ."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Sản xuất và trao đổi mở rộng làm tăng quan hệ phụ thuộc, hợp tác và phối hợp nguồn lực.",
      "sourceRef": "Mục 2.1, trang 8."
    },
    {
      "id": "mln-064",
      "difficulty": 2,
      "topic": "Tự nguyện liên hiệp",
      "prompt": "Nội dung quyền dân tộc tự quyết có bao gồm quyền tự nguyện liên hiệp không?",
      "options": [
        {
          "id": "o1",
          "text": "Không, tự quyết chỉ là quyền tách khỏi mọi hợp tác."
        },
        {
          "id": "o2",
          "text": "Có, nhưng phải từ bỏ địa vị bình đẳng để gia nhập."
        },
        {
          "id": "o3",
          "text": "Có, trên cơ sở bình đẳng và tự nguyện."
        },
        {
          "id": "o4",
          "text": "Không, liên hiệp luôn là sự áp đặt từ cộng đồng mạnh hơn."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Theo báo cáo, tự quyết bao hàm khả năng độc lập và quyền tự nguyện liên hiệp bình đẳng.",
      "sourceRef": "Mục 2.2, trang 10."
    },
    {
      "id": "mln-065",
      "difficulty": 2,
      "topic": "Quan điểm và chính sách",
      "prompt": "Phân biệt nào đúng giữa quan điểm và chính sách dân tộc trong báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Quan điểm chỉ nói về kinh tế, chính sách chỉ nói về văn hóa."
        },
        {
          "id": "o2",
          "text": "Quan điểm áp dụng cho đa số, chính sách chỉ áp dụng cho thiểu số."
        },
        {
          "id": "o3",
          "text": "Quan điểm có thể thay thế việc tổ chức thực hiện chính sách."
        },
        {
          "id": "o4",
          "text": "Quan điểm định hướng mục tiêu, nguyên tắc; chính sách cụ thể hóa thành giải pháp."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Các nguyên tắc cần được chuyển thành giải pháp trên các lĩnh vực và điều kiện thực tế.",
      "sourceRef": "Mục 3.2–3.3, trang 14–15."
    },
    {
      "id": "mln-066",
      "difficulty": 3,
      "topic": "Sinh kế vùng cao",
      "prompt": "Một xã có nông sản nhưng khó bán vì thiếu kỹ năng chế biến và đường vận chuyển. Nên ưu tiên cách làm nào?",
      "options": [
        {
          "id": "o1",
          "text": "Kết hợp đào tạo kỹ năng, cải thiện kết nối thị trường và hạ tầng phù hợp."
        },
        {
          "id": "o2",
          "text": "Chỉ tổ chức giới thiệu văn hóa để thay nhiệm vụ phát triển sinh kế."
        },
        {
          "id": "o3",
          "text": "Chỉ cấp vốn đồng đều, không cần xem trở ngại của từng nhóm sản xuất."
        },
        {
          "id": "o4",
          "text": "Chỉ tăng sản lượng, chờ thị trường tự giải quyết khó khăn vận chuyển."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Tiếp cận đồng bộ xử lý các nút thắt kỹ năng, hạ tầng và thị trường hỗ trợ phát triển bằng nội lực.",
      "sourceRef": "Mục 3.3, trang 15."
    },
    {
      "id": "mln-067",
      "difficulty": 3,
      "topic": "Ưu tiên theo nhu cầu",
      "prompt": "Hai cộng đồng cùng địa bàn gặp trở ngại dịch vụ khác nhau. Phân bổ hỗ trợ theo mức khó khăn thể hiện điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Thay địa vị bình đẳng bằng thứ bậc nhận hỗ trợ."
        },
        {
          "id": "o2",
          "text": "Tạo điều kiện bình đẳng thực chất theo nhu cầu và rào cản."
        },
        {
          "id": "o3",
          "text": "Chia quyền công dân theo mức độ phát triển."
        },
        {
          "id": "o4",
          "text": "Đồng nhất mức phát triển trước khi công nhận quyền."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Cách hỗ trợ khác nhau có thể giảm rào cản trong khi quyền và nghĩa vụ vẫn ngang nhau.",
      "sourceRef": "Mục 2.2 và 3.1, trang 10 và 12."
    },
    {
      "id": "mln-068",
      "difficulty": 3,
      "topic": "Tham gia và ngôn ngữ",
      "prompt": "Cuộc họp cộng đồng có nhiều người chưa hiểu tốt tiếng dùng trong tài liệu. Giải pháp nào tăng tham gia thực chất?",
      "options": [
        {
          "id": "o1",
          "text": "Giữ tài liệu khó hiểu để thống nhất quy trình họp."
        },
        {
          "id": "o2",
          "text": "Chỉ lấy ý kiến những người sử dụng thành thạo tiếng chung."
        },
        {
          "id": "o3",
          "text": "Giải thích dễ hiểu, hỗ trợ ngôn ngữ và tạo cơ hội góp ý."
        },
        {
          "id": "o4",
          "text": "Thay tham vấn bằng thông báo quyết định đã hoàn tất."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tiếp cận thông tin và khả năng bày tỏ ý kiến là điều kiện của sự tham gia thực chất.",
      "sourceRef": "Mục 1.2 và 3.3, trang 5 và 15."
    },
    {
      "id": "mln-069",
      "difficulty": 3,
      "topic": "Tiếp cận y tế",
      "prompt": "Người dân ở bản xa khó tới cơ sở y tế. Chính sách nào giải quyết trực tiếp rào cản này?",
      "options": [
        {
          "id": "o1",
          "text": "Tăng số văn bản tuyên truyền mà không đổi khả năng tiếp cận."
        },
        {
          "id": "o2",
          "text": "Tổ chức thêm hội diễn để thay các hỗ trợ dịch vụ."
        },
        {
          "id": "o3",
          "text": "Đánh giá bằng số cơ sở y tế của toàn tỉnh thay cho bản xa."
        },
        {
          "id": "o4",
          "text": "Cải thiện kết nối và cách cung cấp dịch vụ phù hợp địa bàn."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Chính sách xã hội cần hướng tới khả năng thụ hưởng thực tế, không chỉ số lượng đầu vào hoặc tuyên bố.",
      "sourceRef": "Mục 3.3, trang 15–16."
    },
    {
      "id": "mln-070",
      "difficulty": 3,
      "topic": "Xen cư và tài nguyên chung",
      "prompt": "Hai cộng đồng cư trú xen kẽ có bất đồng về dùng nguồn nước. Cách xử lý nào phù hợp nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Đối thoại, làm rõ nhu cầu và thống nhất phương án công bằng cho các bên."
        },
        {
          "id": "o2",
          "text": "Ưu tiên mặc định cộng đồng đông người hơn trong mọi thời điểm."
        },
        {
          "id": "o3",
          "text": "Tách quyền sử dụng theo nguồn gốc tộc người mà không xét nhu cầu."
        },
        {
          "id": "o4",
          "text": "Coi truyền thống đoàn kết là đủ, không cần xử lý bất đồng cụ thể."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Tôn trọng khác biệt và giải quyết hài hòa lợi ích giúp duy trì đồng thuận trong không gian chung.",
      "sourceRef": "Mục 3.1, trang 12–13."
    },
    {
      "id": "mln-071",
      "difficulty": 3,
      "topic": "Giáo dục và tiếng mẹ đẻ",
      "prompt": "Một trường muốn học sinh dùng tốt tiếng giao tiếp chung và giữ tiếng mẹ đẻ. Lựa chọn nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Dùng tiếng chung để thay toàn bộ hoạt động văn hóa gia đình."
        },
        {
          "id": "o2",
          "text": "Hỗ trợ tiếng chung và tạo điều kiện học, sử dụng tiếng mẹ đẻ."
        },
        {
          "id": "o3",
          "text": "Chỉ dạy tiếng mẹ đẻ và hạn chế giao tiếp với cộng đồng khác."
        },
        {
          "id": "o4",
          "text": "Đợi mọi học sinh đổi tiếng mẹ đẻ rồi mới mở rộng cơ hội học tập."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Chức năng giao tiếp chung có thể kết hợp với bảo tồn ngôn ngữ và bản sắc tộc người.",
      "sourceRef": "Mục 1.2 và 3.3, trang 5 và 15."
    },
    {
      "id": "mln-072",
      "difficulty": 3,
      "topic": "Hợp tác và độc lập",
      "prompt": "Một quốc gia tự lựa chọn tham gia chương trình trao đổi khoa học bình đẳng với nước khác. Điều này cho thấy gì?",
      "options": [
        {
          "id": "o1",
          "text": "Hợp tác luôn là bước từ bỏ quyền tự quyết."
        },
        {
          "id": "o2",
          "text": "Độc lập chỉ tồn tại nếu giảm liên hệ quốc tế."
        },
        {
          "id": "o3",
          "text": "Quyền tự chủ có thể được thực hiện qua lựa chọn hợp tác tự nguyện."
        },
        {
          "id": "o4",
          "text": "Liên hiệp chỉ hình thành khi các nước nhập thành một nhà nước."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Độc lập và hợp tác không tất yếu đối lập; điều kiện bình đẳng, tự nguyện có ý nghĩa quyết định.",
      "sourceRef": "Mục 2.1–2.2, trang 8–10."
    },
    {
      "id": "mln-073",
      "difficulty": 3,
      "topic": "Đoàn kết người lao động",
      "prompt": "Nhóm lao động đa tộc người phối hợp đòi điều kiện làm việc công bằng và tôn trọng tập quán của nhau. Đây là ví dụ gì?",
      "options": [
        {
          "id": "o1",
          "text": "Đồng nhất văn hóa để thay khác biệt dân tộc."
        },
        {
          "id": "o2",
          "text": "Tách quyền lao động theo quy mô từng tộc người."
        },
        {
          "id": "o3",
          "text": "Liên hiệp các nhà nước theo địa bàn sản xuất."
        },
        {
          "id": "o4",
          "text": "Đoàn kết vì lợi ích lao động chung gắn với tôn trọng quyền dân tộc."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Liên hiệp công nhân và nhân dân lao động dựa trên lợi ích chung, không phủ định bản sắc.",
      "sourceRef": "Mục 2.2, trang 10–11."
    },
    {
      "id": "mln-074",
      "difficulty": 3,
      "topic": "Cộng đồng ít người",
      "prompt": "Một tộc người rất ít dân gặp khó khăn truyền dạy ngôn ngữ. Hướng hỗ trợ nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Thiết kế hỗ trợ truyền dạy theo nhu cầu với sự tham gia của cộng đồng."
        },
        {
          "id": "o2",
          "text": "Ngừng hỗ trợ vì số người thụ hưởng thấp hơn các cộng đồng lớn."
        },
        {
          "id": "o3",
          "text": "Chuyển sang ngôn ngữ khác để không cần bảo tồn tiếng nói riêng."
        },
        {
          "id": "o4",
          "text": "Tăng địa vị pháp lý của cộng đồng thay cho hỗ trợ điều kiện thực tế."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Dân số ít có thể cần cách hỗ trợ riêng về bảo tồn, nhưng không tạo thứ bậc địa vị giữa các dân tộc.",
      "sourceRef": "Mục 3.1 và 3.3, trang 11 và 15."
    },
    {
      "id": "mln-075",
      "difficulty": 3,
      "topic": "Di cư và bản sắc",
      "prompt": "Một người chuyển từ miền núi ra đô thị làm việc và vẫn gắn bó với văn hóa tộc người. Nhận định nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "Đổi nơi cư trú làm người đó chuyển sang tộc người đa số."
        },
        {
          "id": "o2",
          "text": "Tham gia đời sống quốc gia có thể cùng tồn tại với bản sắc tộc người."
        },
        {
          "id": "o3",
          "text": "Người đó phải chọn giữa quyền công dân và bản sắc riêng."
        },
        {
          "id": "o4",
          "text": "Giữ bản sắc khiến người đó không thuộc cộng đồng quốc gia."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Cư trú và nghề nghiệp thay đổi không tự động làm mất ý thức tộc người hoặc tư cách thành viên quốc gia.",
      "sourceRef": "Mục 1.2–1.4, trang 5–7."
    },
    {
      "id": "mln-076",
      "difficulty": 3,
      "topic": "Chỉ tiêu theo quy mô",
      "prompt": "Một chương trình chỉ so tổng số người được hỗ trợ giữa hai cộng đồng có quy mô rất khác nhau. Nên bổ sung điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Thứ bậc văn hóa của hai cộng đồng."
        },
        {
          "id": "o2",
          "text": "Quyền ưu tiên mặc định cho bên đông dân."
        },
        {
          "id": "o3",
          "text": "Mức bao phủ, nhu cầu và rào cản thực tế của mỗi cộng đồng."
        },
        {
          "id": "o4",
          "text": "Tên gọi cộng đồng để thay số liệu tiếp cận."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tổng số tuyệt đối chưa phản ánh cơ hội tiếp cận khi quy mô dân số và nhu cầu khác nhau.",
      "sourceRef": "Mục 3.1 và 3.3, trang 11 và 15–16."
    },
    {
      "id": "mln-077",
      "difficulty": 3,
      "topic": "Bảo tồn có chọn lọc",
      "prompt": "Một cộng đồng chủ động điều chỉnh cách tổ chức lễ hội cho phù hợp đời sống mới nhưng giữ giá trị cốt lõi. Nên đánh giá thế nào?",
      "options": [
        {
          "id": "o1",
          "text": "Mọi thay đổi đều là mất bản sắc nên phải khôi phục nguyên trạng."
        },
        {
          "id": "o2",
          "text": "Chỉ cơ quan ngoài cộng đồng mới được quyết định thay đổi."
        },
        {
          "id": "o3",
          "text": "Hiện đại hóa đòi hỏi ngừng các thực hành truyền thống."
        },
        {
          "id": "o4",
          "text": "Bảo tồn có thể gắn với thích nghi và quyền lựa chọn của cộng đồng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Bản sắc không phải yếu tố cố định bất biến; cần xét sự tiếp nối, lựa chọn và tham gia của người dân.",
      "sourceRef": "Mục 1.3 và 3.1, trang 6 và 13."
    },
    {
      "id": "mln-078",
      "difficulty": 3,
      "topic": "Sinh kế và sinh thái",
      "prompt": "Dự án sinh kế vùng núi có nguy cơ làm suy giảm tài nguyên địa phương. Lựa chọn nào phù hợp báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Kết hợp tạo sinh kế với khai thác hợp lý và bảo vệ môi trường."
        },
        {
          "id": "o2",
          "text": "Chỉ xem thu nhập năm đầu, không tính khả năng duy trì nguồn lực."
        },
        {
          "id": "o3",
          "text": "Ưu tiên khai thác nhanh rồi dùng trợ cấp thay nguồn sinh kế lâu dài."
        },
        {
          "id": "o4",
          "text": "Tách bảo vệ môi trường khỏi chính sách phát triển vùng."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Phát triển kinh tế cần đi cùng khai thác hợp lý tiềm năng và bảo vệ tài nguyên, môi trường.",
      "sourceRef": "Mục 3.2–3.3, trang 14–15."
    },
    {
      "id": "mln-079",
      "difficulty": 3,
      "topic": "Phát huy nội lực",
      "prompt": "Hỗ trợ nào hướng rõ nhất tới khả năng tự vươn lên của cộng đồng?",
      "options": [
        {
          "id": "o1",
          "text": "Cấp hỗ trợ ngắn hạn thay các cơ hội học tập và việc làm."
        },
        {
          "id": "o2",
          "text": "Kết hợp kỹ năng, sinh kế và khả năng tiếp cận thị trường."
        },
        {
          "id": "o3",
          "text": "Thay quyết định của người dân bằng mô hình áp dụng sẵn."
        },
        {
          "id": "o4",
          "text": "Đánh giá chỉ bằng mức kinh phí chuyển tới địa phương."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Mục tiêu dài hạn gồm nâng năng lực chủ động phát triển, không chỉ phân phối đầu vào.",
      "sourceRef": "Mục 3.3, trang 15."
    },
    {
      "id": "mln-080",
      "difficulty": 3,
      "topic": "Phối hợp chính sách",
      "prompt": "Huyện làm đường tới trường nhưng không phối hợp lịch và nguồn lực với giáo dục. Cách cải thiện nào hợp lý?",
      "options": [
        {
          "id": "o1",
          "text": "Để mỗi ngành tiếp tục tách biệt nhằm tránh trách nhiệm chung."
        },
        {
          "id": "o2",
          "text": "Chỉ đánh giá tiến độ đường, không cần xét sử dụng trường học."
        },
        {
          "id": "o3",
          "text": "Phối hợp hạ tầng với nhu cầu học tập và dịch vụ của cộng đồng."
        },
        {
          "id": "o4",
          "text": "Chuyển mọi nhiệm vụ giáo dục sang đơn vị thi công giao thông."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Tính liên ngành giúp giải pháp hạ tầng gắn với nhu cầu và kết quả xã hội thực tế.",
      "sourceRef": "Mục 3.2–3.3, trang 14–16."
    },
    {
      "id": "mln-081",
      "difficulty": 3,
      "topic": "Tham gia quản lý",
      "prompt": "Bồi dưỡng cán bộ người dân tộc thiểu số để tham gia quản lý địa phương trực tiếp góp phần vào mục tiêu nào?",
      "options": [
        {
          "id": "o1",
          "text": "Xác lập nhà nước riêng của từng tộc người."
        },
        {
          "id": "o2",
          "text": "Thay thế đầu tư dịch vụ bằng thay đổi nhân sự."
        },
        {
          "id": "o3",
          "text": "Tăng đặc quyền pháp lý theo nguồn gốc tộc người."
        },
        {
          "id": "o4",
          "text": "Tăng năng lực và sự tham gia vào công việc chung."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Chính sách coi trọng quyền tham gia, nguồn nhân lực và vai trò chủ thể trong đời sống chính trị – xã hội.",
      "sourceRef": "Mục 3.2–3.3, trang 14–15."
    },
    {
      "id": "mln-082",
      "difficulty": 3,
      "topic": "Đoàn kết trong thực tiễn",
      "prompt": "Các cộng đồng cùng hỗ trợ nhau chống thiên tai và khôi phục sản xuất. Điều này thể hiện rõ điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Đoàn kết được củng cố qua phối hợp hành động và lợi ích chung."
        },
        {
          "id": "o2",
          "text": "Đoàn kết đòi hỏi thống nhất mọi phong tục trước khi hợp tác."
        },
        {
          "id": "o3",
          "text": "Đoàn kết chỉ là sự tương đồng về nguồn gốc huyết thống."
        },
        {
          "id": "o4",
          "text": "Đoàn kết có thể thay việc giải quyết quyền lợi cụ thể."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Truyền thống đoàn kết gắn với lao động, chống thiên tai, bảo vệ đất nước và các hành động tương trợ.",
      "sourceRef": "Mục 3.1, trang 12–13."
    },
    {
      "id": "mln-083",
      "difficulty": 3,
      "topic": "Vai trò người dân biên giới",
      "prompt": "Chương trình phát triển vùng biên giới muốn tăng tính bền vững. Vai trò nào của người dân cần được coi trọng?",
      "options": [
        {
          "id": "o1",
          "text": "Chỉ nhận hỗ trợ sau khi các bên ngoài hoàn tất quyết định."
        },
        {
          "id": "o2",
          "text": "Tham gia xác định nhu cầu, thực hiện và bảo vệ thành quả chung."
        },
        {
          "id": "o3",
          "text": "Chỉ tham gia hoạt động văn hóa, không góp ý phát triển sinh kế."
        },
        {
          "id": "o4",
          "text": "Chuyển việc bảo vệ địa bàn hoàn toàn cho cơ quan chuyên trách."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Vai trò chủ thể, đời sống và sự gắn bó địa phương góp phần phát triển và ổn định địa bàn.",
      "sourceRef": "Mục 3.1 và 3.3–3.4, trang 12 và 16–17."
    },
    {
      "id": "mln-084",
      "difficulty": 3,
      "topic": "Truyền nối ngôn ngữ",
      "prompt": "Địa phương đã ghi âm tiếng nói truyền thống nhưng trẻ em ít có cơ hội học. Nên bổ sung giải pháp nào?",
      "options": [
        {
          "id": "o1",
          "text": "Tăng lưu trữ thay cho mọi hình thức sử dụng ngôn ngữ."
        },
        {
          "id": "o2",
          "text": "Chuyển ngôn ngữ thành nội dung chỉ dành cho khách tham quan."
        },
        {
          "id": "o3",
          "text": "Hỗ trợ truyền dạy và thực hành trong sinh hoạt phù hợp của cộng đồng."
        },
        {
          "id": "o4",
          "text": "Dùng số tệp lưu trữ làm căn cứ kết luận ngôn ngữ đã được duy trì."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Bảo tồn cần sự sống và truyền nối trong cộng đồng; lưu trữ là hỗ trợ, chưa tự thay thế thực hành.",
      "sourceRef": "Mục 1.3 và 3.3, trang 6 và 15."
    },
    {
      "id": "mln-085",
      "difficulty": 3,
      "topic": "Cơ hội việc làm",
      "prompt": "Một trung tâm giới thiệu việc làm muốn hỗ trợ lao động đa tộc người. Cách làm nào phù hợp bình đẳng và tôn trọng?",
      "options": [
        {
          "id": "o1",
          "text": "Xếp ưu tiên cơ hội theo giá trị văn hóa được gán cho tộc người."
        },
        {
          "id": "o2",
          "text": "Yêu cầu từ bỏ tiếng mẹ đẻ để được nhận tư vấn nghề."
        },
        {
          "id": "o3",
          "text": "Dùng một cách hỗ trợ bất kể khác biệt về kỹ năng và tiếp cận thông tin."
        },
        {
          "id": "o4",
          "text": "Bảo đảm cơ hội không kỳ thị và hỗ trợ theo nhu cầu, kỹ năng thực tế."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Bình đẳng kết hợp giảm rào cản và tôn trọng khác biệt, không gán thứ bậc theo tộc người.",
      "sourceRef": "Mục 2.2 và 3.3, trang 10 và 15–16."
    },
    {
      "id": "mln-086",
      "difficulty": 4,
      "topic": "Đoàn kết và bất đồng",
      "prompt": "Có ý kiến: “Đã có truyền thống đoàn kết thì không cần xử lý bất đồng lợi ích hiện nay.” Lỗi lập luận là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Coi nền tảng đoàn kết lịch sử có thể thay việc giải quyết lợi ích cụ thể."
        },
        {
          "id": "o2",
          "text": "Chưa đề nghị áp dụng một phong tục chung cho mọi tộc người."
        },
        {
          "id": "o3",
          "text": "Đánh giá quá cao nhu cầu tách riêng địa bàn của từng cộng đồng."
        },
        {
          "id": "o4",
          "text": "Chưa dùng quy mô dân số làm chuẩn phân chia quyền lợi."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Truyền thống tạo nền tảng; sự tin cậy còn cần được củng cố qua quyền lợi, cơ hội và hành động thực tế.",
      "sourceRef": "Mục 3.1, trang 12–13."
    },
    {
      "id": "mln-087",
      "difficulty": 4,
      "topic": "Nguyên nhân chênh lệch",
      "prompt": "Một người quy mọi chênh lệch phát triển cho bản sắc tộc người, không xét địa hình, hạ tầng và dịch vụ. Phê bình nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "Cần thay bản sắc bằng số dân như một nguyên nhân duy nhất."
        },
        {
          "id": "o2",
          "text": "Đã bỏ qua hệ điều kiện lịch sử, tự nhiên và cơ hội tiếp cận tác động lẫn nhau."
        },
        {
          "id": "o3",
          "text": "Chỉ cần xét thu nhập hiện tại, không cần các nguyên nhân khác."
        },
        {
          "id": "o4",
          "text": "Cần bỏ yếu tố lịch sử vì các cộng đồng đều sống trong một quốc gia."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Báo cáo phân tích nhiều yếu tố liên hệ, không quy chất lượng phát triển thành đặc tính cố hữu của tộc người.",
      "sourceRef": "Mục 3.1, trang 12."
    },
    {
      "id": "mln-088",
      "difficulty": 4,
      "topic": "Khuôn mẫu hình thành dân tộc",
      "prompt": "Lập luận “mọi dân tộc chỉ hình thành khi đã có thị trường tư bản hoàn chỉnh” không phù hợp báo cáo vì sao?",
      "options": [
        {
          "id": "o1",
          "text": "Vì phương thức sản xuất không ảnh hưởng các cộng đồng người."
        },
        {
          "id": "o2",
          "text": "Vì mọi dân tộc đều hình thành từ một quan hệ huyết thống duy nhất."
        },
        {
          "id": "o3",
          "text": "Vì báo cáo nhấn mạnh con đường lịch sử khác nhau, nhất là giữa phương Đông và phương Tây."
        },
        {
          "id": "o4",
          "text": "Vì thị trường chỉ tồn tại sau khi nhà nước không còn vai trò."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Không nên tuyệt đối hóa một con đường khi điều kiện lịch sử, văn hóa và kinh tế khác nhau.",
      "sourceRef": "Mục 1.1, trang 3–4."
    },
    {
      "id": "mln-089",
      "difficulty": 4,
      "topic": "Một chỉ tiêu thay toàn diện",
      "prompt": "Chương trình xem tăng doanh thu là bằng chứng đủ cho thành công dù tiếp cận y tế giảm. Nhận xét nào đúng nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Doanh thu không có bất kỳ ý nghĩa nào trong chính sách dân tộc."
        },
        {
          "id": "o2",
          "text": "Chỉ cần thay doanh thu bằng số công trình là đủ đánh giá toàn diện."
        },
        {
          "id": "o3",
          "text": "Y tế thuộc lĩnh vực riêng nên không liên quan hiệu quả phát triển."
        },
        {
          "id": "o4",
          "text": "Chương trình dùng một kết quả kinh tế để thay cho đánh giá nhiều mặt."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Phát triển kinh tế có ý nghĩa nhưng không thay thế kết quả xã hội và các quyền, cơ hội khác.",
      "sourceRef": "Mục 3.3–3.4, trang 15–17."
    },
    {
      "id": "mln-090",
      "difficulty": 4,
      "topic": "Ngôn ngữ và cấp độ cộng đồng",
      "prompt": "Nhận định “cùng dùng tiếng Việt nên mọi công dân thuộc cùng một tộc người” nhầm điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Nhầm ngôn ngữ giao tiếp quốc gia với dấu hiệu xác định tộc người."
        },
        {
          "id": "o2",
          "text": "Nhầm nơi cư trú với thu nhập cá nhân."
        },
        {
          "id": "o3",
          "text": "Chỉ sai vì chưa xét mức thành thạo tiếng Việt."
        },
        {
          "id": "o4",
          "text": "Chỉ sai vì chưa xác định người đó sống ở miền núi hay đô thị."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Ngôn ngữ chung có thể được nhiều tộc người sử dụng mà không xóa ngôn ngữ, văn hóa và ý thức riêng.",
      "sourceRef": "Mục 1.2–1.4, trang 5–7."
    },
    {
      "id": "mln-091",
      "difficulty": 4,
      "topic": "Đánh giá quyền thực chất",
      "prompt": "Một chính sách chỉ kiểm đếm văn bản bình đẳng, không khảo sát khả năng thụ hưởng. Thiếu sót chủ yếu là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Không xếp hạng quyền theo mức phát triển của từng dân tộc."
        },
        {
          "id": "o2",
          "text": "Chưa đo điều kiện thực tế để quyền được thực hiện."
        },
        {
          "id": "o3",
          "text": "Chưa thay pháp luật bằng phân phối hỗ trợ đồng đều."
        },
        {
          "id": "o4",
          "text": "Không loại bỏ nguyên tắc pháp lý ra khỏi đánh giá."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Bình đẳng có mặt pháp lý và thực tiễn; đánh giá cần xem rào cản và mức tiếp cận thực tế.",
      "sourceRef": "Mục 2.2 và 3.3, trang 9–10 và 15–16."
    },
    {
      "id": "mln-092",
      "difficulty": 4,
      "topic": "Chuyên môn hóa và thống nhất",
      "prompt": "Một ý kiến cho rằng vùng trồng cây và vùng sản xuất máy không cùng cơ cấu nên chưa có kinh tế thống nhất. Điểm sai là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Chưa yêu cầu mọi vùng đạt năng suất bằng nhau."
        },
        {
          "id": "o2",
          "text": "Chưa xem giống nhau về nghề nghiệp là tiêu chí duy nhất."
        },
        {
          "id": "o3",
          "text": "Đồng nhất thống nhất kinh tế với giống nhau về cơ cấu, bỏ qua phân công và trao đổi."
        },
        {
          "id": "o4",
          "text": "Chưa thay liên kết thị trường bằng tách biệt địa phương."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Khác biệt cơ cấu có thể tạo nhu cầu liên kết; thống nhất thể hiện qua quan hệ kinh tế, không phải cùng sản phẩm.",
      "sourceRef": "Mục 1.2, trang 4."
    },
    {
      "id": "mln-093",
      "difficulty": 4,
      "topic": "Liên kết cưỡng ép",
      "prompt": "Một sự liên kết bị áp đặt, bên yếu không có quyền lựa chọn. Vì sao không thể dùng nó làm mẫu hợp tác bền vững?",
      "options": [
        {
          "id": "o1",
          "text": "Vì liên kết chỉ bền khi các bên có cùng tiếng mẹ đẻ."
        },
        {
          "id": "o2",
          "text": "Vì quyền tự chủ đòi hỏi không hợp tác về kinh tế."
        },
        {
          "id": "o3",
          "text": "Vì liên kết phải luôn dẫn tới một nhà nước mới."
        },
        {
          "id": "o4",
          "text": "Vì thiếu bình đẳng và tự nguyện, dễ tạo áp đặt và căng thẳng."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Hai xu hướng có thể hỗ trợ nhau khi tôn trọng chủ thể, bình đẳng và tự nguyện; cưỡng ép làm suy yếu nền tảng đó.",
      "sourceRef": "Mục 2.1, trang 8–9."
    },
    {
      "id": "mln-094",
      "difficulty": 4,
      "topic": "Bản sắc bất biến",
      "prompt": "Đề án yêu cầu giữ nguyên mọi cách sinh hoạt cũ và không cho cộng đồng lựa chọn điều chỉnh. Vấn đề cốt lõi là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Coi bản sắc bất biến và xem nhẹ vai trò chủ thể trong phát triển văn hóa."
        },
        {
          "id": "o2",
          "text": "Chưa đặt số lượng nghi lễ làm chỉ tiêu duy nhất."
        },
        {
          "id": "o3",
          "text": "Cho phép quá nhiều liên hệ giữa bản sắc và đời sống."
        },
        {
          "id": "o4",
          "text": "Chưa dùng thu nhập để thay mọi yêu cầu bảo tồn."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Báo cáo nhấn mạnh văn hóa có thể được tiếp thu, điều chỉnh và phát huy với sự tham gia của cộng đồng.",
      "sourceRef": "Mục 1.3 và 3.1, trang 6 và 13."
    },
    {
      "id": "mln-095",
      "difficulty": 4,
      "topic": "Số bình quân",
      "prompt": "Thu nhập bình quân một huyện tăng nhưng khoảng cách tiếp cận trường học giữa các bản vẫn lớn. Có thể kết luận gì?",
      "options": [
        {
          "id": "o1",
          "text": "Bình quân tăng chứng minh bình đẳng đã hoàn thành ở mọi bản."
        },
        {
          "id": "o2",
          "text": "Cần xem phân bố lợi ích và tiếp cận dịch vụ, chưa thể kết luận toàn diện."
        },
        {
          "id": "o3",
          "text": "Khoảng cách dịch vụ không cần xét nếu tổng thu nhập đã tăng."
        },
        {
          "id": "o4",
          "text": "Bình quân tăng chứng minh các cộng đồng đã có cùng trình độ phát triển."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Một chỉ số bình quân không mô tả đầy đủ phân bố cơ hội, dịch vụ và chênh lệch giữa nhóm dân cư.",
      "sourceRef": "Mục 3.1 và 3.3–3.4, trang 12 và 15–17."
    },
    {
      "id": "mln-096",
      "difficulty": 4,
      "topic": "Ổn định và dân sinh",
      "prompt": "Một phương án vùng biên coi dân sinh là việc tách rời ổn định an ninh. Phê bình nào phù hợp báo cáo?",
      "options": [
        {
          "id": "o1",
          "text": "Cần để phát triển kinh tế thay hoàn toàn nhiệm vụ bảo vệ chủ quyền."
        },
        {
          "id": "o2",
          "text": "Chỉ bản sắc văn hóa mới tác động tới quốc phòng – an ninh."
        },
        {
          "id": "o3",
          "text": "Bỏ qua vai trò đời sống, đoàn kết và sự gắn bó của dân cư đối với địa bàn."
        },
        {
          "id": "o4",
          "text": "Cần ưu tiên đồng nhất tiếng mẹ đẻ trước mọi chính sách an ninh."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Chăm lo quyền lợi và phát huy người dân tạo nền tảng xã hội cho ổn định và bảo vệ Tổ quốc.",
      "sourceRef": "Mục 3.3–3.4, trang 16–17."
    },
    {
      "id": "mln-097",
      "difficulty": 4,
      "topic": "Trách nhiệm liên ngành",
      "prompt": "Cơ quan chuyên trách được giao tự xử lý mọi vấn đề dân tộc, còn y tế và giáo dục không phối hợp. Nhận xét nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "Phù hợp vì chuyên trách có thể thay mọi ngành về dịch vụ."
        },
        {
          "id": "o2",
          "text": "Phù hợp vì chính sách dân tộc chỉ là hoạt động văn hóa."
        },
        {
          "id": "o3",
          "text": "Chưa đủ vì cần chuyển hết trách nhiệm sang chính người dân."
        },
        {
          "id": "o4",
          "text": "Không phù hợp với trách nhiệm chung và tính liên ngành của công tác dân tộc."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Công tác dân tộc cần cả hệ thống phối hợp, không chỉ một cơ quan.",
      "sourceRef": "Mục 3.2–3.3, trang 14–16."
    },
    {
      "id": "mln-098",
      "difficulty": 4,
      "topic": "Ưu tiên và đặc quyền",
      "prompt": "Có ý kiến coi ưu tiên hạ tầng vùng khó khăn là trao đặc quyền dân tộc. Phản biện nào đúng nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Giảm rào cản phát triển không đồng nghĩa trao địa vị pháp lý cao hơn."
        },
        {
          "id": "o2",
          "text": "Vùng được hỗ trợ có thể miễn nghĩa vụ để bù khó khăn."
        },
        {
          "id": "o3",
          "text": "Hễ có hỗ trợ khác nhau thì không còn nguyên tắc bình đẳng."
        },
        {
          "id": "o4",
          "text": "Bình đẳng chỉ tồn tại khi ngân sách mỗi địa phương giống nhau."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Ưu tiên điều kiện phát triển nhằm thực hiện cơ hội bình đẳng, không tạo quyền áp đặt hoặc địa vị cao thấp.",
      "sourceRef": "Mục 2.2 và 3.1–3.2, trang 10 và 12–14."
    },
    {
      "id": "mln-099",
      "difficulty": 4,
      "topic": "Giấy tờ và tộc người",
      "prompt": "Một khảo sát dùng quốc tịch làm tiêu chí duy nhất để kết luận mọi người cùng tộc người. Lỗi chính là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Không dùng địa chỉ thường trú làm căn cứ duy nhất."
        },
        {
          "id": "o2",
          "text": "Đồng nhất cộng đồng công dân quốc gia với cộng đồng tộc người."
        },
        {
          "id": "o3",
          "text": "Chưa dùng mức thu nhập để phân chia tộc người."
        },
        {
          "id": "o4",
          "text": "Không giả định một quốc gia chỉ có một tiếng mẹ đẻ."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Cùng quốc tịch không xóa sự đa dạng ngôn ngữ, văn hóa và ý thức tự giác của các tộc người.",
      "sourceRef": "Mục 1.3–1.4, trang 6–7."
    },
    {
      "id": "mln-100",
      "difficulty": 4,
      "topic": "Liên kết dân tộc và giai cấp",
      "prompt": "Khi trình bày Cương lĩnh, chỉ nêu bình đẳng và tự quyết mà bỏ liên hiệp công nhân sẽ thiếu nội dung nào?",
      "options": [
        {
          "id": "o1",
          "text": "Yêu cầu mọi cộng đồng chuyển sang cùng một nghề."
        },
        {
          "id": "o2",
          "text": "Cơ chế dùng dân số quyết định quyền tự quyết."
        },
        {
          "id": "o3",
          "text": "Sự đoàn kết lao động gắn giải phóng dân tộc với giải phóng giai cấp."
        },
        {
          "id": "o4",
          "text": "Yêu cầu mỗi cộng đồng có chính phủ riêng trước khi hợp tác."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Liên hiệp công nhân thể hiện lợi ích, hành động đoàn kết và quan hệ giữa giải phóng dân tộc với giải phóng giai cấp.",
      "sourceRef": "Mục 2.2, trang 10–11."
    },
    {
      "id": "mln-101",
      "difficulty": 4,
      "topic": "Lựa chọn hợp tác",
      "prompt": "Một nước giữ quyền tự lựa chọn tham gia hoặc không tham gia liên kết bình đẳng. Vì sao đây không phải phủ nhận xu hướng liên hiệp?",
      "options": [
        {
          "id": "o1",
          "text": "Vì liên hiệp không cần có lợi ích chung."
        },
        {
          "id": "o2",
          "text": "Vì liên hiệp chỉ là việc sử dụng ngôn ngữ khác."
        },
        {
          "id": "o3",
          "text": "Vì quyền tự quyết chỉ tồn tại trước thời kỳ hợp tác."
        },
        {
          "id": "o4",
          "text": "Vì tự nguyện và quyền chủ thể là điều kiện của liên kết phù hợp."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Giữ quyền tự chủ và lựa chọn hợp tác có thể hỗ trợ nhau trong hai xu hướng khách quan.",
      "sourceRef": "Mục 2.1–2.2, trang 8–10."
    },
    {
      "id": "mln-102",
      "difficulty": 4,
      "topic": "Nhận diện tộc người",
      "prompt": "Một người đề nghị chỉ hỏi ý thức tự nhận, bỏ hẳn ngôn ngữ, văn hóa và lịch sử. Cách đánh giá nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Tự giác quan trọng nhưng cần xem kết hợp các dấu hiệu trong hoàn cảnh cụ thể."
        },
        {
          "id": "o2",
          "text": "Đúng vì ý thức tự nhận khiến các yếu tố lịch sử mất vai trò."
        },
        {
          "id": "o3",
          "text": "Sai vì chỉ chữ viết riêng mới xác định được tộc người."
        },
        {
          "id": "o4",
          "text": "Sai vì nơi làm việc hiện tại là tiêu chí quyết định duy nhất."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Báo cáo nhấn mạnh vai trò đặc biệt của tự giác, đồng thời yêu cầu kết hợp các tiêu chí.",
      "sourceRef": "Mục 1.3, trang 6–7."
    },
    {
      "id": "mln-103",
      "difficulty": 4,
      "topic": "Thiết kế chính sách một khuôn",
      "prompt": "Cùng một mô hình sinh kế được áp dụng cho địa bàn có điều kiện tài nguyên, kỹ năng rất khác nhau. Rủi ro chính là gì?",
      "options": [
        {
          "id": "o1",
          "text": "Làm mọi cộng đồng có cùng quyền công dân."
        },
        {
          "id": "o2",
          "text": "Không phù hợp nhu cầu và năng lực thực tế, khó phát huy nội lực."
        },
        {
          "id": "o3",
          "text": "Tạo sự đa dạng giải pháp vượt quá nguyên tắc thống nhất."
        },
        {
          "id": "o4",
          "text": "Khiến mọi cộng đồng tự động có thị trường riêng."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Chính sách phải tính điều kiện cụ thể, thế mạnh và sự tham gia, không chỉ sao chép mô hình.",
      "sourceRef": "Mục 3.1–3.3, trang 12–15."
    },
    {
      "id": "mln-104",
      "difficulty": 4,
      "topic": "Đầu vào và kết quả",
      "prompt": "Một dự án giải ngân đủ nhưng người dân vẫn khó tới trường và trạm y tế. Vì sao chưa thể kết luận đạt mục tiêu?",
      "options": [
        {
          "id": "o1",
          "text": "Vì giải ngân không bao giờ có ý nghĩa quản lý."
        },
        {
          "id": "o2",
          "text": "Vì phải tăng số văn bản thay cho khảo sát người dân."
        },
        {
          "id": "o3",
          "text": "Vì hoàn thành đầu vào chưa chứng minh cải thiện khả năng thụ hưởng."
        },
        {
          "id": "o4",
          "text": "Vì chỉ thu nhập mới là kết quả có thể đánh giá."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Cần đánh giá kết quả tiếp cận thực tế và đời sống, không đồng nhất nguồn lực đã chi với mục tiêu đạt được.",
      "sourceRef": "Mục 3.3–3.4, trang 15–17."
    },
    {
      "id": "mln-105",
      "difficulty": 4,
      "topic": "Bảo tồn gắn đời sống",
      "prompt": "Một chương trình quảng bá văn hóa tốt nhưng không tạo cơ hội truyền dạy hay lợi ích cho cộng đồng. Thiếu điều gì?",
      "options": [
        {
          "id": "o1",
          "text": "Một bộ trang phục chung cho các tộc người."
        },
        {
          "id": "o2",
          "text": "Một yêu cầu ngừng mọi giao lưu với bên ngoài."
        },
        {
          "id": "o3",
          "text": "Một tiêu chí tăng số khách thay cho đời sống."
        },
        {
          "id": "o4",
          "text": "Sự gắn kết bảo tồn với thực hành, quyền tham gia và đời sống người dân."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Giá trị sống và vai trò chủ thể của cộng đồng không được thay thế bằng hoạt động quảng bá đơn thuần.",
      "sourceRef": "Mục 3.1 và 3.3, trang 13 và 15."
    },
    {
      "id": "mln-106",
      "difficulty": 5,
      "topic": "Ba nhận định về cộng đồng",
      "prompt": "Xét: (1) Một quốc gia có thể gồm nhiều tộc người; (2) Mỗi tộc người cần nhà nước riêng; (3) Dùng tiếng chung không tự xóa bản sắc. Nhóm nhận định nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "(1) và (3)."
        },
        {
          "id": "o2",
          "text": "(1) và (2)."
        },
        {
          "id": "o3",
          "text": "(2) và (3)."
        },
        {
          "id": "o4",
          "text": "Cả (1), (2) và (3)."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "(2) nhầm điều kiện của cộng đồng quốc gia với dấu hiệu của từng tộc người; (1) và (3) phù hợp báo cáo.",
      "sourceRef": "Mục 1.2–1.4, trang 5–7."
    },
    {
      "id": "mln-107",
      "difficulty": 5,
      "topic": "Phân bổ nguồn lực",
      "prompt": "Hai vùng cùng có quyền pháp lý; vùng A đã có dịch vụ tốt, vùng B xa trường và trạm y tế. Phương án nào kết hợp bình đẳng và phát huy nội lực tốt nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Chia cùng khoản tiền, không xét khác biệt tiếp cận."
        },
        {
          "id": "o2",
          "text": "Ưu tiên giảm rào cản vùng B, kèm kỹ năng và tham gia của người dân."
        },
        {
          "id": "o3",
          "text": "Tăng quyền pháp lý của vùng B thay cho đầu tư dịch vụ."
        },
        {
          "id": "o4",
          "text": "Đợi hai vùng có cùng thu nhập rồi mới triển khai hỗ trợ."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Quyền ngang nhau có thể đi cùng ưu tiên điều kiện thực hiện quyền và nâng năng lực chủ động.",
      "sourceRef": "Mục 2.2 và 3.1–3.3, trang 10 và 12–16."
    },
    {
      "id": "mln-108",
      "difficulty": 5,
      "topic": "Suy luận từ dữ liệu",
      "prompt": "Dữ liệu cho thấy thu nhập bình quân tăng, chênh lệch tiếp cận y tế chưa giảm, ý kiến người dân chưa được khảo sát. Kết luận nào có cơ sở nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Tăng thu nhập đủ chứng minh chính sách thành công toàn diện."
        },
        {
          "id": "o2",
          "text": "Chênh lệch y tế chứng minh mọi phần của chính sách đều thất bại."
        },
        {
          "id": "o3",
          "text": "Có tiến bộ kinh tế nhưng chưa đủ bằng chứng về bình đẳng thực chất và sự tham gia."
        },
        {
          "id": "o4",
          "text": "Chưa có ý kiến người dân nên không được ghi nhận tiến bộ kinh tế."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Cần phân biệt kết quả từng mặt; không suy từ một chỉ báo sang toàn bộ hiệu quả hoặc phủ nhận kết quả đã có.",
      "sourceRef": "Mục 3.3–3.4, trang 15–17."
    },
    {
      "id": "mln-109",
      "difficulty": 5,
      "topic": "Hai cấp độ gắn bó",
      "prompt": "Một công dân vừa gắn bó với quốc gia, vừa duy trì ý thức tộc người. Nhận định nào giải thích đúng quan hệ này?",
      "options": [
        {
          "id": "o1",
          "text": "Hai gắn bó chỉ cùng tồn tại khi người đó có hai quốc tịch."
        },
        {
          "id": "o2",
          "text": "Gắn bó tộc người luôn làm giảm nghĩa vụ đối với quốc gia."
        },
        {
          "id": "o3",
          "text": "Gắn bó quốc gia đòi hỏi tiếng mẹ đẻ và phong tục phải giống nhau."
        },
        {
          "id": "o4",
          "text": "Chỉnh thể quốc gia và bản sắc thành phần có thể bổ sung, không tất yếu loại trừ nhau."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Quốc gia đa tộc người kết hợp lợi ích, thể chế chung với những đời sống lịch sử – văn hóa riêng.",
      "sourceRef": "Mục 1.4 và 3.4, trang 7 và 17."
    },
    {
      "id": "mln-110",
      "difficulty": 5,
      "topic": "Lộ trình phối hợp",
      "prompt": "Vùng khó khăn đồng thời thiếu sinh kế, trường học và cơ hội tham gia. Lộ trình nào phù hợp tính toàn diện, lâu dài và cấp bách?",
      "options": [
        {
          "id": "o1",
          "text": "Xử lý nhu cầu thiết yếu trước mắt và phối hợp các lĩnh vực trong kế hoạch dài hạn có cộng đồng tham gia."
        },
        {
          "id": "o2",
          "text": "Chỉ tăng sản lượng trước, hoãn dịch vụ và tham gia đến khi mọi hộ đạt cùng thu nhập."
        },
        {
          "id": "o3",
          "text": "Chỉ mở hoạt động văn hóa để tạo đoàn kết, chờ các điều kiện vật chất tự cải thiện."
        },
        {
          "id": "o4",
          "text": "Chia từng lĩnh vực thành giai đoạn độc lập, không cần phối hợp giữa các ngành."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Tính cấp bách và chiến lược có thể kết hợp; đồng bộ không đòi hỏi chờ hoàn tất một lĩnh vực mới xét các quyền khác.",
      "sourceRef": "Mục 3.2–3.3, trang 14–16."
    },
    {
      "id": "mln-111",
      "difficulty": 5,
      "topic": "Cương lĩnh trong tình huống lao động",
      "prompt": "Liên minh lao động đa dân tộc muốn phối hợp chống áp bức. Cách tổ chức nào phù hợp cả ba nội dung Cương lĩnh?",
      "options": [
        {
          "id": "o1",
          "text": "Bình đẳng về danh nghĩa, để nhóm đông nhất quyết định con đường của các nhóm khác."
        },
        {
          "id": "o2",
          "text": "Tôn trọng địa vị ngang nhau, quyền lựa chọn chính đáng và phối hợp vì lợi ích lao động chung."
        },
        {
          "id": "o3",
          "text": "Giữ bản sắc riêng nhưng loại mọi hành động phối hợp giữa các nhóm để bảo đảm tự quyết."
        },
        {
          "id": "o4",
          "text": "Tăng sức mạnh chung bằng cách yêu cầu nhóm ít người bỏ tiếng nói và quyền lựa chọn."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Ba nguyên tắc liên hệ hữu cơ: bình đẳng, vai trò chủ thể và đoàn kết cùng chống áp bức.",
      "sourceRef": "Mục 2.2, trang 9–11."
    },
    {
      "id": "mln-112",
      "difficulty": 5,
      "topic": "Quyền và điều kiện",
      "prompt": "Xét: (1) Bình đẳng không phụ thuộc số dân; (2) Hỗ trợ theo trở ngại có thể khác nhau; (3) Hỗ trợ nhiều hơn làm địa vị pháp lý cao hơn. Chọn nhóm đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(1) và (3)."
        },
        {
          "id": "o2",
          "text": "(2) và (3)."
        },
        {
          "id": "o3",
          "text": "(1) và (2)."
        },
        {
          "id": "o4",
          "text": "Cả (1), (2) và (3)."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Khác biệt hỗ trợ nhằm giảm rào cản, không tạo thứ bậc quyền; (3) suy luận sai.",
      "sourceRef": "Mục 2.2 và 3.1, trang 10–12."
    },
    {
      "id": "mln-113",
      "difficulty": 5,
      "topic": "Bằng chứng về tham gia",
      "prompt": "Dự án tuyên bố cộng đồng được tham gia quyết định. Bằng chứng nào phù hợp nhất để kiểm tra tuyên bố này?",
      "options": [
        {
          "id": "o1",
          "text": "Số áp phích được treo sau khi phương án đã chốt."
        },
        {
          "id": "o2",
          "text": "Kinh phí truyền thông và số người được mời nghe phổ biến."
        },
        {
          "id": "o3",
          "text": "Chữ ký của một đại diện mà không có nội dung hoặc phản hồi."
        },
        {
          "id": "o4",
          "text": "Khả năng tiếp cận thông tin, cơ hội góp ý và cách ý kiến được phản hồi trong quyết định."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Tham gia thực chất bao gồm điều kiện hiểu, bày tỏ và có phản hồi, không chỉ sự hiện diện hình thức.",
      "sourceRef": "Mục 3.3, trang 15."
    },
    {
      "id": "mln-114",
      "difficulty": 5,
      "topic": "Quan hệ nhân quả",
      "prompt": "Sau khi làm đường, thu nhập tăng nhưng không có dữ liệu về dịch vụ, văn hóa và tham gia. Lập luận nào thận trọng và đúng phạm vi nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Đường có thể hỗ trợ sinh kế; vẫn cần dữ liệu khác để đánh giá toàn diện công tác dân tộc."
        },
        {
          "id": "o2",
          "text": "Thu nhập tăng chứng minh bảo tồn văn hóa và quyền tham gia đã được bảo đảm."
        },
        {
          "id": "o3",
          "text": "Không có dữ liệu văn hóa chứng minh con đường không có hiệu quả kinh tế."
        },
        {
          "id": "o4",
          "text": "Chỉ cần số tiền làm đường để thay khảo sát mọi kết quả còn lại."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Không suy rộng từ kết quả kinh tế sang mọi phương diện; các lĩnh vực liên hệ nhưng cần bằng chứng tương ứng.",
      "sourceRef": "Mục 3.3–3.4, trang 15–17."
    },
    {
      "id": "mln-115",
      "difficulty": 5,
      "topic": "Bản sắc và hiện đại hóa",
      "prompt": "Cộng đồng sử dụng công nghệ để truyền dạy tiếng mẹ đẻ và giao lưu với nhóm khác. Đánh giá nào kết hợp đúng các khái niệm?",
      "options": [
        {
          "id": "o1",
          "text": "Công nghệ làm bản sắc mất tính truyền thống nên không còn giá trị bảo tồn."
        },
        {
          "id": "o2",
          "text": "Đổi phương tiện có thể hỗ trợ truyền nối bản sắc và liên kết, nếu cộng đồng chủ động tham gia."
        },
        {
          "id": "o3",
          "text": "Giao lưu chứng minh cộng đồng đã chuyển thành một tộc người khác."
        },
        {
          "id": "o4",
          "text": "Giữ bản sắc chỉ đạt được nếu dừng các hình thức tiếp nhận từ bên ngoài."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Bản sắc không đồng nhất với giữ nguyên phương tiện; giao lưu và chủ động tiếp thu có thể hỗ trợ phát triển văn hóa.",
      "sourceRef": "Mục 1.3, 2.1 và 3.3, trang 6, 8–9 và 15."
    },
    {
      "id": "mln-116",
      "difficulty": 5,
      "topic": "Ba yêu cầu đồng thời",
      "prompt": "Một chính sách cần bình đẳng, thống nhất quốc gia và giữ bản sắc. Biện pháp nào đáp ứng cả ba?",
      "options": [
        {
          "id": "o1",
          "text": "Đồng nhất phong tục và ngôn ngữ để mọi người có hình thức sinh hoạt giống nhau."
        },
        {
          "id": "o2",
          "text": "Chia dịch vụ theo tộc người và giảm phối hợp chung để bảo đảm tính độc lập."
        },
        {
          "id": "o3",
          "text": "Bảo đảm quyền ngang nhau, kết nối dịch vụ chung và hỗ trợ thực hành văn hóa riêng."
        },
        {
          "id": "o4",
          "text": "Giữ nguyên mọi tập quán và miễn nghĩa vụ chung cho các cộng đồng gặp khó khăn."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "Quyền ngang nhau, kết nối quốc gia và bản sắc riêng có thể cùng được bảo đảm; không cần đồng hóa hoặc biệt lập.",
      "sourceRef": "Mục 1.4, 2.2 và 3.3, trang 7, 10 và 15–16."
    },
    {
      "id": "mln-117",
      "difficulty": 5,
      "topic": "Tự quyết và lịch sử cụ thể",
      "prompt": "Xét: (1) Tự quyết là tự định đoạt vận mệnh; (2) Bao hàm tự nguyện liên hiệp bình đẳng; (3) Mọi yêu cầu giữ tiếng mẹ đẻ đều là ly khai. Chọn nhóm đúng.",
      "options": [
        {
          "id": "o1",
          "text": "(1) và (3)."
        },
        {
          "id": "o2",
          "text": "(2) và (3)."
        },
        {
          "id": "o3",
          "text": "Cả (1), (2) và (3)."
        },
        {
          "id": "o4",
          "text": "(1) và (2)."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "(3) đồng nhất bảo tồn bản sắc với yêu sách chính trị khác cấp độ; hai nội dung đầu phù hợp báo cáo.",
      "sourceRef": "Mục 2.1–2.2, trang 8–10."
    },
    {
      "id": "mln-118",
      "difficulty": 5,
      "topic": "Gói chính sách biên giới",
      "prompt": "Một huyện biên giới muốn củng cố an ninh, giảm nghèo và duy trì văn hóa. Gói nào phù hợp nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Kết nối sinh kế và dịch vụ, hỗ trợ văn hóa, tham gia cộng đồng và phối hợp bảo vệ địa bàn."
        },
        {
          "id": "o2",
          "text": "Tập trung tuần tra, chờ hoàn tất an ninh rồi mới xét đời sống, giáo dục và ngôn ngữ."
        },
        {
          "id": "o3",
          "text": "Tập trung lễ hội và du lịch, dùng doanh thu thay mọi tiêu chí về tiếp cận và ổn định."
        },
        {
          "id": "o4",
          "text": "Chỉ tăng trợ cấp, giao các bên ngoài quyết định để không mất thời gian tham vấn."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Phát triển dân sinh, văn hóa, vai trò người dân và quốc phòng – an ninh có quan hệ bổ sung.",
      "sourceRef": "Mục 3.2–3.4, trang 14–17."
    },
    {
      "id": "mln-119",
      "difficulty": 5,
      "topic": "Hài hòa lợi ích xen cư",
      "prompt": "Nhiều cộng đồng cùng dùng rừng và nguồn nước có nhu cầu khác nhau. Quy trình nào phù hợp bình đẳng, đoàn kết và phát triển bền vững?",
      "options": [
        {
          "id": "o1",
          "text": "Dựa vào số dân để trao toàn bộ quyền quyết định cho cộng đồng lớn nhất."
        },
        {
          "id": "o2",
          "text": "Tham vấn các bên, xét nhu cầu và sinh thái, thống nhất trách nhiệm và cách theo dõi lợi ích."
        },
        {
          "id": "o3",
          "text": "Tách các cộng đồng khỏi thị trường chung và cấm trao đổi tài nguyên giữa các nhóm."
        },
        {
          "id": "o4",
          "text": "Giữ nguyên quyết định ban đầu để thể hiện đoàn kết, không xem xét tác động khác nhau."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Giải quyết lợi ích cụ thể cần tôn trọng chủ thể, điều kiện sinh thái và cơ chế phối hợp thay vì áp đặt.",
      "sourceRef": "Mục 3.1 và 3.3, trang 12–13 và 15–16."
    },
    {
      "id": "mln-120",
      "difficulty": 5,
      "topic": "Tổng hợp quan điểm",
      "prompt": "Xét: (1) Công tác dân tộc có tính lâu dài; (2) Chỉ cơ quan chuyên trách chịu trách nhiệm; (3) Phát triển cần nhiều lĩnh vực phối hợp; (4) Cần phát huy nội lực. Nhóm nào đúng?",
      "options": [
        {
          "id": "o1",
          "text": "(1), (2), (3)."
        },
        {
          "id": "o2",
          "text": "(2), (3), (4)."
        },
        {
          "id": "o3",
          "text": "(1), (3), (4)."
        },
        {
          "id": "o4",
          "text": "(1), (2), (4)."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "(2) trái trách nhiệm chung của cả hệ thống chính trị; ba nhận định còn lại phù hợp các quan điểm trong báo cáo.",
      "sourceRef": "Mục 3.2, trang 13–14."
    },
    {
      "id": "mln-121",
      "difficulty": 5,
      "topic": "Kết quả và duy trì",
      "prompt": "Bộ bằng chứng nào mạnh nhất cho thấy hỗ trợ đã cải thiện cơ hội phát triển bền vững?",
      "options": [
        {
          "id": "o1",
          "text": "Giải ngân hết và nhiều công trình, dù chưa có dữ liệu sử dụng."
        },
        {
          "id": "o2",
          "text": "Nhiều hội nghị và văn bản, dù người dân chưa hiểu nội dung."
        },
        {
          "id": "o3",
          "text": "Tăng số khách tham quan, dù tiếng mẹ đẻ ít được truyền dạy hơn."
        },
        {
          "id": "o4",
          "text": "Giảm rào cản dịch vụ, tăng kỹ năng và sinh kế, có tham gia và truyền nối văn hóa."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Kết quả thụ hưởng và năng lực chủ động nhiều mặt phù hợp hơn việc chỉ kiểm đếm đầu vào hoặc quảng bá.",
      "sourceRef": "Mục 3.3–3.4, trang 15–17."
    },
    {
      "id": "mln-122",
      "difficulty": 5,
      "topic": "Du lịch và bảo tồn",
      "prompt": "Du lịch tăng doanh thu nhưng cộng đồng ít được quyết định và thực hành truyền thống bị thu hẹp. Hướng điều chỉnh nào phù hợp?",
      "options": [
        {
          "id": "o1",
          "text": "Kết hợp lợi ích sinh kế với quyền tham gia, truyền dạy và thực hành văn hóa của cộng đồng."
        },
        {
          "id": "o2",
          "text": "Chỉ tăng quảng bá vì doanh thu sẽ tự khắc phục mọi tác động đến bản sắc."
        },
        {
          "id": "o3",
          "text": "Dừng mọi giao lưu vì tiếp xúc văn hóa luôn xóa bỏ ý thức tộc người."
        },
        {
          "id": "o4",
          "text": "Để doanh nghiệp quyết định nội dung, thay tiếng nói cộng đồng bằng chỉ tiêu khách."
        }
      ],
      "correctOptionId": "o1",
      "explanation": "Không đồng nhất doanh thu với bảo tồn; phát triển văn hóa cần vai trò chủ thể và giá trị sống.",
      "sourceRef": "Mục 3.1 và 3.3, trang 13 và 15."
    },
    {
      "id": "mln-123",
      "difficulty": 5,
      "topic": "Điều kiện cần và đủ",
      "prompt": "Một cộng đồng có tiếng nói riêng. Chỉ từ dữ kiện đó, kết luận nào được báo cáo cho phép?",
      "options": [
        {
          "id": "o1",
          "text": "Đã đủ xác định một quốc gia độc lập có chủ quyền."
        },
        {
          "id": "o2",
          "text": "Có một dấu hiệu nhận diện tộc người, cần xét thêm văn hóa và ý thức tự giác."
        },
        {
          "id": "o3",
          "text": "Đã đủ yêu cầu một nhà nước riêng trong quốc gia đa tộc người."
        },
        {
          "id": "o4",
          "text": "Có quyền pháp lý cao hơn cộng đồng không có chữ viết riêng."
        }
      ],
      "correctOptionId": "o2",
      "explanation": "Một dấu hiệu riêng không đủ suy ra quốc gia, nhà nước hoặc thứ bậc quyền; cần kết hợp tiêu chí đúng cấp độ.",
      "sourceRef": "Mục 1.3–1.4 và 2.2, trang 6–7 và 10."
    },
    {
      "id": "mln-124",
      "difficulty": 5,
      "topic": "Chuyển từ hỗ trợ sang năng lực",
      "prompt": "Một chương trình muốn giảm phụ thuộc hỗ trợ nhưng vẫn bảo đảm an sinh vùng khó khăn. Phương án nào cân bằng đúng mục tiêu?",
      "options": [
        {
          "id": "o1",
          "text": "Dừng dịch vụ ngay để tạo sức ép tự vươn lên, không xét điều kiện ban đầu."
        },
        {
          "id": "o2",
          "text": "Duy trì cấp phát thay cho đào tạo vì cộng đồng chỉ cần nguồn tiền ổn định."
        },
        {
          "id": "o3",
          "text": "Giữ hỗ trợ thiết yếu, đồng thời nâng kỹ năng, kết nối sinh kế và quyền tham gia của người dân."
        },
        {
          "id": "o4",
          "text": "Chỉ hỗ trợ nhóm có sẵn lợi thế, coi kết quả bình quân là đại diện cho mọi người."
        }
      ],
      "correctOptionId": "o3",
      "explanation": "An sinh và phát huy nội lực bổ sung nhau; không cần loại bỏ điều kiện sống để khuyến khích năng lực.",
      "sourceRef": "Mục 3.2–3.3, trang 14–16."
    },
    {
      "id": "mln-125",
      "difficulty": 5,
      "topic": "Chẩn đoán nhiều mặt",
      "prompt": "Một địa phương có tăng trưởng, văn bản bình đẳng và nhiều lễ hội, nhưng tiếp cận dịch vụ còn chênh lệch và tham vấn yếu. Kết luận nào phù hợp nhất?",
      "options": [
        {
          "id": "o1",
          "text": "Đã hoàn thành toàn diện vì ba đầu ra tích cực đủ thay mọi chỉ báo khác."
        },
        {
          "id": "o2",
          "text": "Chưa có tiến bộ nào vì các mặt còn hạn chế phủ nhận kết quả kinh tế và văn hóa."
        },
        {
          "id": "o3",
          "text": "Chỉ cần tăng lễ hội để bù cho thiếu dịch vụ và quyền tham gia."
        },
        {
          "id": "o4",
          "text": "Có kết quả từng mặt nhưng cần cải thiện bình đẳng thực chất, tham gia và phối hợp chính sách."
        }
      ],
      "correctOptionId": "o4",
      "explanation": "Đánh giá toàn diện ghi nhận kết quả đồng thời xác định các điều kiện, quyền và lĩnh vực còn thiếu.",
      "sourceRef": "Mục 3.3–3.4, trang 15–17."
    }
  ]
}
```
