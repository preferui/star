(function () {
  // --- Khai báo & Kiểm tra Bắt buộc ---
  const RATING_SECTION = document.querySelector(".ghRating-section");

  // Kiểm tra điều kiện cần thiết
  if (!RATING_SECTION || typeof ghRatings === "undefined" || !ghRatings.firebaseUrl) {
    console.error("Lỗi: Không tìm thấy phần tử đánh giá (.ghRating-section) hoặc biến ghRatings.");
    return;
  }

  // Khởi tạo các biến DOM và cấu hình
  const FIREBASE_URL = ghRatings.firebaseUrl.replace(/\/$/, '');
  const avgScoreEl = RATING_SECTION.querySelector("#avgScore");
  const starsAverageEl = RATING_SECTION.querySelector("#starsAverage");
  const totalRatingEl = RATING_SECTION.querySelector(".total-rating .total");
  const ratedCaptionEl = RATING_SECTION.querySelector(".rated-caption");
  const ratingProgressEls = RATING_SECTION.querySelectorAll(".rating-progress");

  let postIdKey = ''; 
  let blogIdKey = ''; 
  let hasUserRated = false; // Cờ kiểm tra trạng thái đánh giá

  // --- Hàm hỗ trợ SEO và Blogger ---

  /**
   * Cập nhật Schema Markup (JSON-LD) cho Google Rich Snippets.
   * Sử dụng data-schema-name được chèn bằng thẻ dữ liệu Blogger.
   */
  function updateSchemaMarkup(totalCount, avgScore) {
    const schemaType = RATING_SECTION.getAttribute('data-schema-type') || 'Product';
    
    // Lấy tên bài viết từ thuộc tính data-schema-name (giả định đã chèn data:post.title/)
    const postTitleFromData = RATING_SECTION.getAttribute('data-schema-name');
    const name = postTitleFromData && postTitleFromData.trim() !== '' 
        ? postTitleFromData.trim() 
        : document.title || 'Bài viết';
    
    let schemaScript = document.querySelector('script[type="application/ld+json"][data-rating-schema]');
    if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        schemaScript.setAttribute('data-rating-schema', 'true');
        document.head.appendChild(schemaScript);
    }

    if (totalCount > 0) {
      const schemaData = {
          "@context": "https://schema.org/",
          "@type": schemaType,
          "name": name, 
          "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": avgScore.toFixed(2),
              "reviewCount": totalCount
          }
      };
      schemaScript.textContent = JSON.stringify(schemaData, null, 2);
    } else {
      // Nếu không có đánh giá, xóa nội dung Schema để tránh lỗi
      schemaScript.textContent = '';
    }
  }

  /**
   * Lấy BlogID và PostID từ Blogger WidgetManager.
   */
  function getBlogAndPostId(callback) {
    const interval = setInterval(() => {
      if (window._WidgetManager && typeof _WidgetManager._GetAllData === "function") {
        clearInterval(interval);
        try {
          const data = _WidgetManager._GetAllData();
          const blogId = "BlogID_" + data.blog.blogId;
          const postId = "PostID_" + data.blog.postId;
          callback(blogId, postId);
        } catch (e) {
          console.error("Không thể lấy BlogID/PostID:", e);
        }
      }
    }, 100);
  }

  // --- Hàm Hiển thị và Logic Đánh giá ---

  /**
   * Hiển thị số sao trung bình bằng SVG.
   */
  function renderStars(average) {
    starsAverageEl.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      let fillPercentage = Math.min(100, Math.max(0, (average - i + 1) * 100));
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.innerHTML = `
        <defs>
          <linearGradient id="grad${i}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="${fillPercentage}%" stop-color="#e0ac33"/>
            <stop offset="${fillPercentage}%" stop-color="#ccc"/>
          </linearGradient>
        </defs>
        <path fill="url(#grad${i})" d="M12 .587l3.668 7.431L24 9.423l-6 5.849
        1.417 8.268L12 18.897 4.583 23.54 6 15.272 0 9.423l8.332-1.405z"/>
      `;
      starsAverageEl.appendChild(svg);
      
      // Thêm sự kiện click để đánh giá
      svg.addEventListener("click", () => {
        if (hasUserRated) {
          return;
        }
        submitRating(i);
      });
    }
    avgScoreEl.textContent = average.toFixed(1);
  }

  /**
   * Cập nhật giao diện dựa trên dữ liệu tải về.
   */
  function updateUI(data) {
    const totalCount = data?.["count"] || 0;
    const totalSum = data?.["sum"] || 0;
    const average = totalCount ? totalSum / totalCount : 0;
    
    // --- 1. Hiển thị ---
    renderStars(average);
    totalRatingEl.textContent = totalCount;
    
    // --- 2. Cập nhật thanh tiến trình ---
    // (Giữ nguyên logic cũ của bạn để tránh thay đổi Rules Firebase, 
    // nhưng cần một trường dữ liệu chi tiết nếu bạn muốn hiển thị thanh tiến trình chính xác)
    // Tạm thời, các thanh tiến trình sẽ không được cập nhật chính xác trừ khi dữ liệu Firebase được sửa đổi.

    // --- 3. Kiểm tra Local Storage (Chống đánh giá lại trên 1 trình duyệt) ---
    // SỬ DỤNG POSTID LÀM KEY ĐỘC LẬP
    if (localStorage.getItem("gh_rated_" + postIdKey) === "true") {
      hasUserRated = true;
      ratedCaptionEl.classList.remove("hidden");
    }

    // --- 4. Cập nhật Schema Markup ---
    updateSchemaMarkup(totalCount, average);
  }

  /**
   * Tải dữ liệu đánh giá từ Firebase.
   */
  function fetchRatings() {
    if (!blogIdKey || !postIdKey) return; 

    fetch(`${FIREBASE_URL}/ghRatings/${blogIdKey}/${postIdKey}.json`)
      .then(response => response.json())
      .then(updateUI)
      .catch(error => {
        console.error("Lỗi khi tải đánh giá:", error);
        updateUI(null); 
      });
  }

  /**
   * Gửi đánh giá mới lên Firebase.
   */
  function submitRating(newScore) {
    if (hasUserRated) return;

    fetch(`${FIREBASE_URL}/ghRatings/${blogIdKey}/${postIdKey}.json`)
      .then(response => response.json())
      .then(currentData => {
        const currentCount = currentData?.["count"] || 0;
        const currentSum = currentData?.["sum"] || 0;
        
        // Dữ liệu mới - KHÔNG CÓ FINGERPRINT THỰC SỰ
        const newData = {
          "sum": currentSum + newScore,
          "count": currentCount + 1,
          // Giữ trường "fingerprints" với giá trị placeholder để HỢP VỚI RULES FIREBASE CŨ
          "fingerprints": {
            "no_fingerprint_v2": true 
          }
        };

        return fetch(`${FIREBASE_URL}/ghRatings/${blogIdKey}/${postIdKey}.json`, {
          "method": "PUT",
          "headers": {
            "Content-Type": "application/json"
          },
          "body": JSON.stringify(newData)
        });
      })
      .then(() => {
        // --- LOGIC CHỐNG TRÙNG LẶP MỚI: Dùng Local Storage ---
        localStorage.setItem("gh_rated_" + postIdKey, "true"); 
        
        hasUserRated = true;
        ratedCaptionEl.classList.remove("hidden");
        fetchRatings(); // Tải lại dữ liệu sau khi gửi thành công
      })
      .catch(error => console.error("Lỗi khi gửi đánh giá:", error));
  }

  // --- Khởi tạo và Tải dữ liệu ---
  getBlogAndPostId((blogId, postId) => {
    blogIdKey = blogId;
    postIdKey = postId;
    fetchRatings();
  });
})();
