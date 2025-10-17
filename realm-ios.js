(function () {
  // --- Khai báo & Kiểm tra Bắt buộc 3.0 ---
  const RATING_SECTION = document.querySelector(".ghRating-section");

  if (!RATING_SECTION || typeof ghRatings === "undefined" || !ghRatings.firebaseUrl) {
    console.error("Lỗi: Không tìm thấy phần tử đánh giá (.ghRating-section) hoặc biến ghRatings.");
    return;
  }

  const FIREBASE_URL = ghRatings.firebaseUrl.replace(/\/$/, '');
  const avgScoreEl = RATING_SECTION.querySelector("#avgScore");
  const starsAverageEl = RATING_SECTION.querySelector("#starsAverage");
  const totalRatingEl = RATING_SECTION.querySelector(".total-rating .total");
  const ratedCaptionEl = RATING_SECTION.querySelector(".rated-caption");
  const ratingProgressEls = RATING_SECTION.querySelectorAll(".rating-progress");

  let postIdKey = ''; 
  let blogIdKey = ''; 
  let userFingerprint = ''; // Biến mới để lưu Fingerprint
  let hasUserRated = false; 

  // --- Hàm Tạo Fingerprint (Được khôi phục) ---
  function generateFingerprint() {
    try {
      // Sử dụng Canvas để tạo mã định danh duy nhất (Fingerprint)
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      // Sử dụng User Agent làm dữ liệu cơ bản
      ctx.fillText(navigator.userAgent, 2, 2);
      // Trả về mã base64 rút gọn
      return btoa(canvas.toDataURL()).slice(0, 32); 
    } catch {
      return "anonymous";
    }
  }

  // --- Hàm hỗ trợ SEO và Blogger (Giữ nguyên) ---

  function updateSchemaMarkup(totalCount, avgScore) {
    const schemaType = RATING_SECTION.getAttribute('data-schema-type') || 'Product';
    const postTitleFromData = RATING_SECTION.getAttribute('data-schema-name');
    const name = postTitleFromData && postTitleFromData.trim() !== '' ? postTitleFromData.trim() : document.title || 'Bài viết';
    
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
      schemaScript.textContent = '';
    }
  }

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
   * Cập nhật giao diện bao gồm điểm trung bình, tổng votes và chi tiết thanh tiến trình.
   */
  function updateUI(data) {
    const totalCount = data?.["count"] || 0;
    const totalSum = data?.["sum"] || 0;
    const average = totalCount ? totalSum / totalCount : 0;
    
    // Lấy chi tiết số votes cho từng sao
    const scoreCounts = data?.["scores"] || {};
    
    // --- 1. Hiển thị điểm trung bình và tổng votes ---
    renderStars(average);
    totalRatingEl.textContent = totalCount;
    
    // --- 2. Cập nhật thanh tiến trình và số votes chi tiết ---
    ratingProgressEls.forEach(el => {
      const rate = el.getAttribute("data-rate");
      const votes = scoreCounts[rate] || 0; 
      const percentage = totalCount ? ((votes / totalCount) * 100).toFixed(1) : 0;
      
      const progressBar = el.querySelector(".progress-bar");
      const votesEl = el.querySelector(".votes");

      if (progressBar) {
        progressBar.style.width = percentage + "%";
      }
      if (votesEl) {
        votesEl.textContent = votes;
      }
    });

    // --- 3. KIỂM TRA ĐÃ ĐÁNH GIÁ (Sử dụng Fingerprint từ Firebase) ---
    const fingerprints = data?.["fingerprints"] || {};
    if (fingerprints[userFingerprint] || localStorage.getItem("gh_rated_" + postIdKey) === "true") {
      hasUserRated = true;
      ratedCaptionEl.classList.remove("hidden");
    } else {
      hasUserRated = false;
      ratedCaptionEl.classList.add("hidden");
    }

    // --- 4. Cập nhật Schema Markup ---
    updateSchemaMarkup(totalCount, average);
  }

  // --- Hàm Tải và Gửi dữ liệu ---

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

  function submitRating(newScore) {
    // KIỂM TRA LẠI LẦN CUỐI TRƯỚC KHI GỬI
    if (hasUserRated) return;

    fetch(`${FIREBASE_URL}/ghRatings/${blogIdKey}/${postIdKey}.json`)
      .then(response => response.json())
      .then(currentData => {
        const currentCount = currentData?.["count"] || 0;
        const currentSum = currentData?.["sum"] || 0;
        const currentScores = currentData?.["scores"] || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        // Lấy danh sách fingerprints hiện tại
        const currentFingerprints = currentData?.["fingerprints"] || {};

        // KIỂM TRA FINGERPRINT TRÊN DATA CŨ (Nếu đã đánh giá lần trước)
        if (currentFingerprints[userFingerprint]) {
             hasUserRated = true;
             return; // Dừng quá trình gửi
        }

        // Tăng vote cho sao mới được đánh giá
        currentScores[newScore] = (currentScores[newScore] || 0) + 1;
        
        const newData = {
          "sum": currentSum + newScore,
          "count": currentCount + 1,
          "scores": currentScores, 
          // LƯU FINGERPRINT CỦA NGƯỜI DÙNG HIỆN TẠI
          "fingerprints": {
            ...currentFingerprints,
            [userFingerprint]: true // Lưu FP để ngăn đánh giá lại
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
        // Cập nhật Local Storage (Ngăn đánh giá lại tức thì/trên trình duyệt này)
        localStorage.setItem("gh_rated_" + postIdKey, "true"); 
        
        hasUserRated = true;
        ratedCaptionEl.classList.remove("hidden");
        fetchRatings(); 
      })
      .catch(error => console.error("Lỗi khi gửi đánh giá:", error));
  }

  // --- Khởi tạo và Tải dữ liệu ---
  userFingerprint = generateFingerprint(); // Tạo Fingerprint ngay khi khởi tạo

  getBlogAndPostId((blogId, postId) => {
    blogIdKey = blogId;
    postIdKey = postId;
    fetchRatings();
  });
})();
