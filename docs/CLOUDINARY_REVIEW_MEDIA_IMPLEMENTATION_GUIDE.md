# Huong Dan Trien Khai Luu Tru Cloud Cho Anh/Video Danh Gia San Pham (Cloudinary)

## 1. Muc tieu

Tai lieu nay huong dan chi tiet:

1. Cach dang ky va cau hinh 1 dich vu cloud de luu anh/video danh gia san pham.
2. Cach tich hop vao he thong hien tai `SmartMobileStore` (backend + frontend).
3. Cach van hanh an toan (bao mat, chi phi, backup, rollback).

Tai lieu chon **Cloudinary** vi:

1. Ho tro ca **image** va **video**.
2. Co CDN, transform, nén, adaptive streaming.
3. Tich hop Node.js don gian.
4. Co goi Free de bat dau nhanh.

---

## 2. Hien trang he thong (codebase hien tai)

### 2.1 Luong review hien tai

Backend:

1. Model review: `backend/src/modules/review/Review.js`
2. Controller review: `backend/src/modules/review/reviewController.js`
3. Routes review: `backend/src/modules/review/reviewRoutes.js`

Frontend:

1. Uploader review image: `frontend/src/components/product/ReviewImageUploader.jsx`
2. Form review: `frontend/src/components/product/ReviewsTab.jsx`
3. API client: `frontend/src/lib/api.js`

### 2.2 Van de hien tai

1. Uploader dang tra ve **base64** (khong upload file thuc len cloud).
2. Payload review dang gui chuoi base64 vao `images`.
3. Chua co luong luu video review cho customer.
4. Scale storage/bandwidth kem va kho kiem soat neu tiep tuc de base64 trong DB.

---

## 3. Dang ky Cloudinary (chi tiet)

## 3.1 Tao tai khoan

1. Truy cap: `https://cloudinary.com/pricing`
2. Chon **Sign Up Free**.
3. Xac minh email va dang nhap Console.

Luu y:

1. Goi Free tai thoi diem tham chieu co:
   1. `No credit card required`
   2. `25 monthly credits`
   3. `3 Users / 1 Account`
2. Thong tin co the thay doi theo thoi gian, can kiem tra lai trang pricing truoc khi chot production.

## 3.2 Lay credentials

1. Vao Cloudinary Console.
2. Mo `Settings` -> `API Keys`.
3. Lay:
   1. `Cloud Name`
   2. `API Key`
   3. `API Secret` (chi dung o backend)
4. Khong commit `API Secret` len git.

## 3.3 Tao Upload Presets (khuyen nghi)

Vao `Settings` -> `Upload` -> `Upload Presets`.

Tao 2 preset:

1. `review_images_signed`
   1. Type: Signed
   2. Asset folder: `reviews/images`
   3. Allowed formats: `jpg,jpeg,png,webp,avif`
2. `review_videos_signed`
   1. Type: Signed
   2. Asset folder: `reviews/videos`
   3. Allowed formats: `mp4,webm,mov`

Khuyen nghi:

1. Dung signed upload cho customer-generated content.
2. Neu dung unsigned thi phai chap nhan rui ro leak preset name.

---

## 4. Kien truc tich hop de xuat (phu hop he thong hien tai)

## 4.1 Kien truc nen dung

**Signed direct upload**:

1. Frontend xin chu ky upload tu backend.
2. Frontend upload truc tiep file len Cloudinary.
3. Cloudinary tra ve `secure_url` + `public_id`.
4. Frontend gui `secure_url` vao API review create/update.
5. Backend luu URL vao MongoDB (khong luu base64).

Luong:

1. `POST /api/reviews/upload/signature` (backend)
2. `POST https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/upload` (frontend -> cloudinary)
3. `POST /api/reviews` (backend) voi media URL

## 4.2 Vi sao khong upload qua server app?

1. App server khong phai stream file lon.
2. Giam CPU/RAM va traffic app.
3. De scale ngang.

---

## 5. Cac thay doi can lam trong codebase

## 5.1 Backend

### A. Cai package

Trong `backend`:

```bash
npm install cloudinary
```

### B. Tao cloudinary client

Tao file: `backend/src/lib/cloudinary.js`

```js
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

### C. Them env vars

`backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CLOUDINARY_REVIEW_IMAGE_PRESET=review_images_signed
CLOUDINARY_REVIEW_VIDEO_PRESET=review_videos_signed
```

### D. Tao endpoint sinh signature

Tao file: `backend/src/modules/review/reviewUploadController.js`

```js
import cloudinary from "../../lib/cloudinary.js";

export const getReviewUploadSignature = async (req, res) => {
  try {
    const { resourceType = "image" } = req.body;
    const timestamp = Math.round(Date.now() / 1000);

    const folder =
      resourceType === "video" ? "reviews/videos" : "reviews/images";

    const paramsToSign = {
      timestamp,
      folder,
      resource_type: resourceType,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      success: true,
      data: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder,
        resourceType,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
```

### E. Add route moi

Cap nhat `backend/src/modules/review/reviewRoutes.js`:

1. Import `getReviewUploadSignature`.
2. Them route:

```js
router.post(
  "/upload/signature",
  protect,
  restrictTo("CUSTOMER", "ADMIN"),
  getReviewUploadSignature
);
```

### F. Cap nhat schema Review de ho tro video (neu can)

Cap nhat `backend/src/modules/review/Review.js`:

```js
videos: [
  {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
    duration: { type: Number, min: 0 },
  },
],
```

Khuyen nghi:

1. Muc tieu review customer: toi da `1` video/review.
2. Validate URL phai la `https://res.cloudinary.com/...`.

### G. Validate media trong create/update review

Trong `reviewController.js`:

1. Khong chap nhan base64 nua (hoac cho phep trong giai doan migration).
2. Validate domain URL cloud.
3. Gioi han:
   1. `images`: max 5
   2. `videos`: max 1

---

## 5.2 Frontend

### A. Them API lay signature

Cap nhat `frontend/src/lib/api.js`:

```js
export const reviewAPI = {
  // ...
  getUploadSignature: (resourceType) =>
    api.post("/reviews/upload/signature", { resourceType }),
};
```

### B. Refactor uploader

Cap nhat `frontend/src/components/product/ReviewImageUploader.jsx`:

1. Khong tra base64 nua.
2. Upload truc tiep sang Cloudinary.
3. On success, tra ve object URL/publicId.

Pseudo:

```js
const sig = await reviewAPI.getUploadSignature("image");

const formData = new FormData();
formData.append("file", file);
formData.append("api_key", sig.apiKey);
formData.append("timestamp", sig.timestamp);
formData.append("signature", sig.signature);
formData.append("folder", sig.folder);

const uploadRes = await fetch(
  `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
  { method: "POST", body: formData }
).then((r) => r.json());

// uploadRes.secure_url, uploadRes.public_id
```

### C. Cap nhat payload review

Trong `ReviewsTab.jsx`, payload `create/update`:

```js
{
  productId,
  orderId,
  rating,
  comment,
  images: [secureUrl1, secureUrl2],
  videos: [{ url, publicId, duration }]
}
```

---

## 6. Chinh sach bao mat bat buoc

1. Khong expose `API Secret` ra frontend.
2. Signature endpoint phai:
   1. bat buoc login (`protect`)
   2. check role (`CUSTOMER`, `ADMIN`)
   3. gioi han request rate (IP + userId)
3. Gioi han mime type + size tren frontend va backend.
4. Sanitize metadata/context.
5. Neu co unsigned preset:
   1. ten preset random kho doan
   2. doi ten preset neu lo preset
   3. uu tien signed cho production.

---

## 7. Van hanh, chi phi, toi uu

1. Dat folder co cau truc:
   1. `reviews/images/<yyyy>/<mm>/...`
   2. `reviews/videos/<yyyy>/<mm>/...`
2. Nen image truoc upload (frontend da co compress logic).
3. Video:
   1. Review video nen gioi han <= 30-60 giay
   2. Khuyen nghi <= 50MB
4. Khi xoa review, goi async cleanup xoa asset tren cloud theo `public_id`.
5. Theo doi:
   1. upload fail rate
   2. average upload latency
   3. monthly credit usage

---

## 8. Ke hoach trien khai theo giai doan

## Phase 1 - MVP (anh review cloud)

1. Signature endpoint.
2. Frontend upload anh len cloud.
3. Review luu URL.
4. Giu video review = off.

## Phase 2 - Video review

1. Them field `videos`.
2. Them UI upload video.
3. Validate duration/size/chat luong.

## Phase 3 - Hardening

1. Rate limit + anti-abuse.
2. Auto moderation/toxic content pipeline.
3. Async cleanup khi delete review.

---

## 9. Migration du lieu cu (neu co)

Neu DB con du lieu base64:

1. Viet script migration:
   1. Doc review co `images` bat dau bang `data:image/`.
   2. Upload base64 len Cloudinary.
   3. Replace bang `secure_url`.
2. Chay migration tren staging truoc.
3. Backup truoc khi migration.

---

## 10. Checklist test nghiem thu

1. Customer upload 1-5 image va submit review thanh cong.
2. Customer upload sai format -> bi chan.
3. Customer upload file qua lon -> bi chan.
4. Update review voi media moi.
5. Delete review -> rating product cap nhat dung.
6. Toggle hidden review -> rating product cap nhat dung.
7. Link media hien thi dung tren ProductDetail.
8. Test mobile network yeu.
9. Test voi account khong login.
10. Test role admin/customer dung route.

---

## 11. Rollback plan

Neu rollout loi:

1. Tat feature flag cloud upload o frontend.
2. Quay lai che do payload cu (tam thoi).
3. Giu du lieu URL da upload (khong mat data review).
4. Fix loi va rollout lai tren staging.

---

## 12. Tai lieu tham chieu (official)

1. Pricing and plan:
   1. https://cloudinary.com/pricing
2. Node.js upload docs:
   1. https://cloudinary.com/documentation/node_image_and_video_upload
3. Upload API reference:
   1. https://cloudinary.com/documentation/image_upload_api_reference
4. Upload presets:
   1. https://cloudinary.com/documentation/upload_presets
5. Upload widget + signed flow:
   1. https://cloudinary.com/documentation/upload_widget
6. Tim cloud name / api key / api secret:
   1. https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials

---

## 13. Ket luan cho he thong hien tai

Voi `SmartMobileStore`, huong toi uu nhat de dua vao production nhanh va an toan la:

1. Chuyen review media sang URL cloud (khong luu base64).
2. Dung **signed direct upload** voi Cloudinary.
3. Trien khai theo 2 buoc: anh truoc, video sau.

Neu can, co the tao tiep tai lieu phan 2: "Patch-level implementation checklist" voi danh sach commit/file thay doi chi tiet de team code theo tung PR.

