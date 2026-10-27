# Rà soát ngân hàng câu hỏi

Ngày: 28/10/2026. Ngân hàng: `mln131-ch6-i-125-v1`.

Dữ liệu trích nguyên khối JSON ở phụ lục đặc tả, giữ 125 ID, stable option IDs, đáp án, giải thích và sourceRef. Không sửa câu nào, vì vậy không có thay đổi nội dung cần đổi bankVersion. Không thêm nội dung phần tôn giáo.

Đã đọc rà sơ bộ các prompt/đáp án và đối chiếu theo nhóm khái niệm với PDF được cung cấp (`MLN131_Bao_cao_chi_tiet_Chuong6_PhanI_co_bang_phan_cong.pdf`, số trang in trùng chỉ số trang PDF trong phần được rà):

| Nội dung                   | Vị trí trong báo cáo     | Điểm rà chính                                                                                           |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Hình thành cộng đồng người | Mục 1.1, trang 3–4       | Chuỗi thị tộc/bộ lạc/bộ tộc/dân tộc; phương thức sản xuất; không áp một mô hình Đông/Tây                |
| Quốc gia và tộc người      | Mục 1.2–1.4, trang 4–7   | Năm đặc trưng quốc gia; ba dấu hiệu tộc người; nhà nước và quốc tịch không đồng nhất bản sắc            |
| Hai xu hướng               | Mục 2.1, trang 7–9       | Độc lập và liên hiệp có thể hỗ trợ nhau; bình đẳng, tự nguyện; bảo tồn không mặc nhiên là ly khai       |
| Cương lĩnh                 | Mục 2.2, trang 9–11      | Bình đẳng, tự quyết, liên hiệp công nhân; không suy ra mỗi tộc người phải có nhà nước riêng             |
| Việt Nam                   | Mục 3.1, trang 11–13     | 54 tộc người, xen cư, địa bàn chiến lược, chênh lệch phát triển, đoàn kết và đa dạng                    |
| Quan điểm, chính sách      | Mục 3.2–3.4, trang 13–17 | Tính toàn diện, liên ngành; quyền tham gia; sinh kế/dịch vụ/văn hóa/an ninh; đánh giá kết quả nhiều mặt |

Các tình huống vận dụng được hiểu là ví dụ học tập của người soạn, không phải tuyên bố khảo sát thực tế. Các câu nhận định nhóm dùng số (1)/(2)/(3), không phụ thuộc nhãn A/B/C/D sau xáo. Chưa nhận thấy mâu thuẫn rõ giữa đáp án đã chọn và các đoạn nguồn đối chiếu; giữ nguyên dữ liệu được giao.

Đây là rà soát sơ bộ khi triển khai, không phải phản biện chuyên môn độc lập của giảng viên hoặc hiệu chuẩn độ khó bằng dữ liệu người chơi. Test schema chỉ kiểm tra cấu trúc và khả năng chấm theo ID, không chứng minh đáp án học thuật. Trước buổi học, người dẫn nên đọc lại nội dung và nguồn; nếu chỉnh câu, ghi ID/lý do ở đây và đổi bankVersion để snapshot cũ không bị chấm với nội dung mới.
