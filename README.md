Giao diện popup Giáng sinh "Noël Nocturne", dựng trên [Next.js](https://nextjs.org) 16 + Tailwind 4.

## Chạy dự án

```bash
npm run dev     # http://localhost:3000
npm run build   # bản production
npm start
```

## Màn xuất hiện

Toàn bộ nằm ở [src/components/christmas/](src/components/christmas/):

| Tệp | Vai trò |
| --- | --- |
| [ChristmasPopup.tsx](src/components/christmas/ChristmasPopup.tsx) | Lớp phủ toàn màn hình: trạng thái mở/đóng, Esc, khoá cuộn, nút mở lại |
| [Stage.tsx](src/components/christmas/Stage.tsx) | Sân khấu và toàn bộ kịch bản xuất hiện |
| [LottieLayer.tsx](src/components/christmas/LottieLayer.tsx) | Bọc `lottie-web`, dùng chung bộ nhớ đệm |
| [Starfield.tsx](src/components/christmas/Starfield.tsx) | Canvas sao nhấp nháy, quầng sáng, sao băng |
| [SnowField.tsx](src/components/christmas/SnowField.tsx) | Nền tuyết nhiều lớp và rặng thông hai bên |
| [VillageSkyline.tsx](src/components/christmas/VillageSkyline.tsx) | Ngôi làng tuyết ở đường chân trời, khói bốc từ ống khói |
| [Countdown.tsx](src/components/christmas/Countdown.tsx) | Đếm ngược tới 25.12 |

Mốc thời gian của kịch bản gom hết trong hằng số `T` ở đầu `Stage.tsx` — đổi ở
đó là đổi cả màn xuất hiện. Đường bay, hiệu ứng tiết lộ và các vòng lặp nền nằm
trong [src/app/globals.css](src/app/globals.css).

Cảnh nặng khoảng 1.5MB Lottie nên được tải trước toàn bộ, nhưng **sau một màn
tối trơn, không có thanh tiến trình**: thiệp vốn mở ra từ nền tối, nên khoảng
chờ trở thành nhịp đầu tiên của chính nó thay vì một bước tải.

Thứ tự diễn: nền tối → hộp quà hiện ra giữa màn và bật mở → ánh sáng từ hộp
quà toả ra thắp sáng cả khung cảnh → ông già Noel lượn một vòng qua bầu trời →
lời chúc và đồng hồ đếm ngược hiện dần → tuần lộc chạy dưới nền tuyết, hai
người tuyết đuổi theo sau.

Hiệu ứng chói trên chữ "CHRISTMAS" là **một lớp nền thứ hai của chính thẻ
chữ**, bị `background-clip: text` cắt theo hình glyph. Trước đó nó là một
`::after` định vị tuyệt đối — tức một khối chữ nhật trắng phủ lên cả bầu trời
phía sau chữ. Nếu cần chỉnh, nhớ giữ `background-repeat: no-repeat`, thiếu nó
dải sáng sẽ lặp lại thành vệt thứ hai bám theo.

Thiệp không có nút bấm trong nội dung; đóng bằng dấu × ở góc trên bên phải
hoặc phím `Esc`, sau đó nút "Mở lại thiệp" hiện ra ở góc dưới.

[page.tsx](src/app/page.tsx) cố tình không có chữ nào. Thiệp phủ kín màn hình
rồi mới hiện dần lên trên nó, nên bất cứ nội dung nào đặt ở trang nền đều lộ
ra trong lúc hiện dần và lúc màn nhung mở — phần còn lại chỉ là nền cho khoảnh
khắc sau khi người xem đóng thiệp.

> **Lưu ý khi dev:** Turbopack ở dự án này thỉnh thoảng phục vụ bản `globals.css`
> cũ và không biên dịch lại dù tệp đã đổi (sửa CSS mà màn hình không đổi là dấu
> hiệu). Khi gặp, khởi động lại `npm run dev`; nếu vẫn còn thì xoá `.next/dev`
> rồi chạy lại. Bản `npm run build` luôn đúng.

## Lottie

Nguồn nằm ở [public/lottie/](public/lottie/). Bốn tệp không dùng trực tiếp được
vì chính bản dựng của chúng có vấn đề, nên có script tạo ra bản dùng được.
**Các tệp `*_alpha.json` / `*_fly.json` / `snowmen_run.json` là tệp sinh ra** —
sửa script rồi chạy lại, đừng sửa tay.

```bash
python scripts/make-transparent-run.py   # noel_run.json      -> noel_run_alpha.json
python scripts/make-santa-flight.py      # Santa Claus.json   -> santa_fly.json
python scripts/make-sleigh-flight.py     # santa sleigh.json  -> sleigh_fly.json
python scripts/make-snowmen.py           # happy holidays.json -> snowmen_run.json
```

Cần `pillow`, `numpy`, `scipy` (chỉ cho script đầu tiên).

- `noel_run.json` là chuỗi ảnh JPEG trên nền trắng đục, không thể đặt lên bầu
  trời đêm. Script tách nền trắng ra khỏi râu và viền lông trắng của ông già
  Noel, rồi xuất lại nhẹ hơn bản gốc.
- `Santa Claus.json` là cả một khung cảnh hoàn chỉnh. Script giữ lại đúng phần
  nhân vật, bỏ chuyển động ngang đã dựng sẵn để CSS điều khiển đường bay, và
  cắt khung vừa nhân vật.
- `santa sleigh.json` có bảy trên tám lớp là ảnh giữ chỗ 4x4, lớp gốc lại co
  ảnh còn `(-14.9%, 16.2%)` nên bị lật và bóp méo. Script lấy riêng phần tranh
  và dựng lại ở kích thước thật.

- `happy holidays.json` là một tấm thiệp: hai người tuyết kèm chữ "Happy
  Holidays", cái chuông và một lớp hạt bay. Trang đã có chữ và tuyết riêng nên
  script chỉ giữ lại hai nhân vật rồi cắt khung vừa họ.

Các tệp gốc vẫn giữ nguyên trong `public/lottie/`. Một số tệp trong thư mục đó
hiện không được dùng tới (`Fun Christmas tree.json`, `day*.json`,
`Santa's Sleigh.json`) — giữ lại để dành, chúng không nằm trong danh sách tải
trước nên không ảnh hưởng tốc độ.

Hai người tuyết chạy đuổi theo xe trượt bằng `.xm-chase`: cùng thời lượng và
cùng độ trễ với `.xm-dash`, chỉ dịch cả quỹ đạo sang phải một đoạn `--gap`, nên
khoảng cách giữa hai bên không đổi suốt hành trình. `--gap` được tính từ chính
chiều rộng xe trượt (`SLEIGH_W` trong `Stage.tsx`) — nếu đặt bằng `cqw` cố định
thì ở màn hình hẹp người tuyết sẽ đè lên xe.

Nền tuyết gồm bốn lớp đồi chồng lên nhau, vẽ bằng SVG trong `SnowField.tsx`.
Hai chi tiết tạo nên chiều sâu: mỗi lớp hắt một bóng mờ **lên trên** lớp phía
sau nó (biến các dải phẳng thành khối), và viền sáng trên đỉnh đồi đậm dần về
phía người xem — lớp xa nhất không có viền, vì ở khoảng cách đó một đường sắc
nét sẽ trông như đường đồng mức chứ không phải tuyết. Hai nhân vật nằm giữa
`SnowFieldBack` và `SnowFieldFront` nên phần chân bị lớp trước che đi một chút,
trông như lún vào tuyết thay vì đứng trên mặt phẳng.

Ngôi làng ở đường chân trời (`VillageSkyline`) cũng là SVG vẽ tay. Hai điểm
đáng lưu ý khi chỉnh sửa:

- **Không có cạnh cứng nào.** Dải sương và lớp tuyết của làng đều tan dần về 0
  ở đáy khung. Trước đó dải sương là một `<rect>` dừng đột ngột ở vạch nền khi
  còn alpha 0.66 — tạo một đường ngang chạy suốt chiều rộng, trông đúng như lỗi
  chồng lớp. Lớp tuyết của làng cũng phải cùng tông với đồi xa của `SnowField`,
  nếu sáng hơn thì phần chồng lấn lại thành một dải riêng.
- **Vị trí được tính, không ướm.** Vạch nền của làng phải trùng đỉnh đồi xa, mà
  hai hình nằm trên hai khung SVG kích thước khác nhau, nên `bottom` suy ra từ
  chiều cao của cả hai (xem chú thích trong `Stage.tsx`). Đặt một phần trăm cố
  định thì đổi kích thước màn hình là làng hoặc lơ lửng trên tuyết hoặc lún mất.

Cây thông (`PineCluster`) cũng vẽ bằng SVG trong cùng tệp, cùng bảng màu —
không dùng Lottie, vì ảnh động hoạt hình lệch hẳn phong cách phẳng của nền.
Chúng là phần tử riêng chứ không nằm chung SVG với các lớp đồi: đồi được kéo
giãn ngang (`preserveAspectRatio="none"`), đồi giãn vẫn ra đồi còn cây giãn thì
méo. Mỗi tầng cành có đỉnh nằm cao hơn đáy tầng trên nó — thiếu phần chồng lấn
đó thì cây trông như chồng nón rời chứ không phải một cây thông. Cụm cây đặt
sau hai nhân vật trong DOM nên xe trượt lướt qua phía sau cây khi ra khỏi màn.

Tranh gốc của người tuyết vẽ hướng sang phải (mũi cà rốt và đuôi khăn quàng đều
chỉ hướng đó), nên khi chạy sang trái phải lật ngang bằng `scaleX(-1)`. Phép lật
nằm trên phần tử Lottie chứ không phải trên `.xm-hop`, vì transform của
`.xm-hop` đã do animation nhảy điều khiển.
