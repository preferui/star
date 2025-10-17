(function () {
  // --- Khai báo & Kiểm tra Bắt buộc ---
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
  let hasUserRated = false; 

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

  // --- Hàm Hiển thị và Logic Đánh giá (Giữ nguyên Render Stars) ---

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

    // Lấy chi tiết số votes cho từng sao (sử dụng scores)
    const scoreCounts = data?.["scores"] || {};
    
    // --- 1. Hiển thị điểm trung bình và tổng votes ---
    renderStars(average);
    totalRatingEl.textContent = totalCount;
    
    // --- 2. Cập nhật thanh tiến trình và số votes chi tiết ---
    ratingProgressEls.forEach(el => {
      // Lấy giá trị data-rate (1 đến 5)
      const rate = el.getAttribute("data-rate");
      
      // Lấy số votes cho sao hiện tại
      const votes = scoreCounts[rate] || 0; 
      
      // Tính toán phần trăm tiến trình
      const percentage = totalCount ? ((votes / totalCount) * 100).toFixed(1) : 0;
      
      // *** ĐIỀU CHỈNH QUAN TRỌNG: Truy vấn phần tử con trong phạm vi 'el' ***
      const progressBar = el.querySelector(".progress-bar");
      const votesEl = el.querySelector(".votes"); // Phần tử chứa số votes

      if (progressBar) {
        progressBar.style.width = percentage + "%";
      }
      if (votesEl) {
        votesEl.textContent = votes;
      }
    });

    // --- 3. Kiểm tra Local Storage (Chống đánh giá lại) ---
    if (localStorage.getItem("gh_rated_" + postIdKey) === "true") {
      hasUserRated = true;
      ratedCaptionEl.classList.remove("hidden");
    }

    // --- 4. Cập nhật Schema Markup ---
    updateSchemaMarkup(totalCount, average);
  }

  // --- Hàm Tải và Gửi dữ liệu (Giữ nguyên) ---

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
    if (hasUserRated) return;

    fetch(`${FIREBASE_URL}/ghRatings/${blogIdKey}/${postIdKey}.json`)
      .then(response => response.json())
      .then(currentData => {
        const currentCount = currentData?.["count"] || 0;
        const currentSum = currentData?.["sum"] || 0;
        
        // Lấy chi tiết số votes hiện tại (tạo mới nếu chưa có)
        // Lưu ý: newScore là số (1-5), dùng làm key truy cập object
        const currentScores = currentData?.["scores"] || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

        // Tăng vote cho sao mới được đánh giá
        currentScores[newScore] = (currentScores[newScore] || 0) + 1;
        
        const newData = {
          "sum": currentSum + newScore,
          "count": currentCount + 1,
          "scores": currentScores, 
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
        localStorage.setItem("gh_rated_" + postIdKey, "true"); 
        
        hasUserRated = true;
        ratedCaptionEl.classList.remove("hidden");
        fetchRatings(); 
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
