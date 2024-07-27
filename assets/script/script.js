document.addEventListener("DOMContentLoaded", () => {
  // Event listener для проектов
  const projects = document.querySelector(".projects");
  if (projects) {
    projects.addEventListener("click", async (e) => {
      const deleteButton = e.target.closest(".delete-button");
      const updateButton = e.target.closest(".update-button");
      if (deleteButton) {
        await fetch(`/api/work/${deleteButton.dataset.id}`, {
          method: "DELETE",
        })
          .then((res) => {
            window.location.reload();
          })
          .catch((err) => {
            console.error("Error deleting work:", err);
          });
      }
      if (updateButton) {
        window.location.href = `/update-work/${updateButton.dataset.id}`;
      }
    });
  }

  // Event listener для новостей
  const newsContainer = document.querySelector(".news");
  if (newsContainer) {
    newsContainer.addEventListener("click", async (e) => {
      const deleteButton = e.target.closest(".delete-button");
      const updateButton = e.target.closest(".update-button");
      if (deleteButton) {
        await fetch(`/api/news/${deleteButton.dataset.id}`, {
          method: "DELETE",
        })
          .then((res) => {
            window.location.reload();
          })
          .catch((err) => {
            console.error("Error deleting news:", err);
          });
      }
      if (updateButton) {
        window.location.href = `/update-news/${updateButton.dataset.id}`;
      }
    });
  }
});
