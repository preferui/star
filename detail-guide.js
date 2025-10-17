(function () {
  const section = document.querySelector(".ghRating-section");
  if (!section || typeof ghRatings === "undefined" || ghRatings.sharedBy !== "www.giahuy.net") return;

  const firebaseConfig = { databaseURL: ghRatings.firebaseUrl };
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  const blogId = ghRatings.sharedBy.replace(/\./g, "-");
  const postId = section.getAttribute("data-post");

  const container = document.createElement("div");
  container.className = "ghRating-container";
  section.appendChild(container);

  // Tạo giao diện sao
  const stars = document.createElement("div");
  stars.className = "ghStars";
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement("i");
    s.className = "bi bi-star";
    s.dataset.value = i;
    stars.appendChild(s);
  }
  container.appendChild(stars);

  // Hiển thị tiến trình sau khi đánh giá
  const progress = document.createElement("div");
  progress.className = "ghProgress";
  for (let i = 5; i >= 1; i--) {
    const row = document.createElement("div");
    row.className = "ghRow";
    row.innerHTML = `
      <span>${"★".repeat(i)}</span>
      <div class="ghBar"><div class="ghFill" id="ghFill${i}"></div></div>
      <span class="ghCount" id="ghCount${i}">0</span>
    `;
    progress.appendChild(row);
  }
  container.appendChild(progress);

  // Sinh fingerprint đơn giản
  const finger = btoa(navigator.userAgent + navigator.language).slice(0, 15);
  const voteRef = db.ref(`ghRatings/${blogId}/${postId}/votes/${finger}`);

  // Kiểm tra đã vote chưa
  voteRef.once("value").then(snap => {
    if (snap.exists()) {
      showSummary();
    } else {
      enableVoting();
    }
  });

  function enableVoting() {
    stars.querySelectorAll("i").forEach(star => {
      star.addEventListener("mouseenter", () => highlightStars(star.dataset.value));
      star.addEventListener("mouseleave", () => highlightStars(0));
      star.addEventListener("click", () => ratePost(star.dataset.value));
    });
  }

  function highlightStars(num) {
    stars.querySelectorAll("i").forEach(s => {
      s.classList.toggle("active", s.dataset.value <= num);
    });
  }

  function ratePost(val) {
    val = parseInt(val);
    voteRef.set(val).then(() => updateSummary(val));
  }

  function updateSummary(val) {
    const sumRef = db.ref(`ghRatings/${blogId}/${postId}/summary/${val}`);
    sumRef.transaction(n => (n || 0) + 1);
    db.ref(`ghRatings/${blogId}/${postId}/total`).transaction(n => (n || 0) + 1);
    db.ref(`ghRatings/${blogId}/${postId}/average`).transaction((oldAvg) => oldAvg || 0);
    showSummary();
  }

  function showSummary() {
    stars.style.display = "none";
    progress.style.display = "block";

    const ref = db.ref(`ghRatings/${blogId}/${postId}/summary`);
    ref.on("value", snap => {
      const data = snap.val() || {};
      let total = 0, sum = 0;
      for (let i = 1; i <= 5; i++) {
        total += data[i] || 0;
        sum += i * (data[i] || 0);
      }
      for (let i = 1; i <= 5; i++) {
        const count = data[i] || 0;
        const percent = total ? (count / total) * 100 : 0;
        document.getElementById(`ghFill${i}`).style.width = percent + "%";
        document.getElementById(`ghCount${i}`).textContent = count;
      }
    });
  }
})();
