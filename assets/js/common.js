// ===============================
// TOAST NOTIFICATION
// ===============================

export function showToast(message, type = "success") {

    let color = "#22c55e";

    if (type === "error") {

        color = "#ef4444";

    }

    else if (type === "warning") {

        color = "#f59e0b";

    }

    else if (type === "info") {

        color = "#3b82f6";

    }

    Toastify({

        text: message,

        duration: 3000,

        gravity: "top",

        position: "right",

        close: true,

        stopOnFocus: true,

        style: {

            background: color,

            borderRadius: "12px",

            fontSize: "15px",

            fontWeight: "500"

        }

    }).showToast();

}