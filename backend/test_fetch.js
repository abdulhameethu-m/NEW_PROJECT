fetch("http://localhost:5000/api/admin/returns")
  .then(res => res.json())
  .then(data => {
    console.log("JSON response:", JSON.stringify(data, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error("Error", err);
    process.exit(1);
  });
