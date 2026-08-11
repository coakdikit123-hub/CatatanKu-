<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0, viewport-fit=cover" name="viewport" />
    <title>Admin Panel - CatatanKu</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries">
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    <style>
        /* ============================================================
               ROOT & BASE
            ============================================================ */
        * {
            font-family: 'Inter', sans-serif;
            box-sizing: border-box;
        }

        :root {
            --accent: #9b8cff;
            --accent-light: #b8adff;
            --accent-dim: rgba(155, 140, 255, 0.12);
            --accent-glow: rgba(155, 140, 255, 0.18);
            --surface-0: #090b14;
            --surface-1: #10131f;
            --surface-2: #181d2e;
            --surface-3: #21273d;
            --surface-4: #2c3350;
            --border: rgba(255, 255, 255, 0.05);
            --border-hover: rgba(155, 140, 255, 0.20);
            --text-1: #edf0f7;
            --text-2: #8e9bb8;
            --text-3: #4a5a78;
            --income: #6ee7b7;
            --expense: #f87171;
            --warning: #fbbf24;
            --radius-sm: 8px;
            --radius-md: 12px;
            --radius-lg: 16px;
            --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.5);
            --shadow-glow: 0 8px 32px rgba(155, 140, 255, 0.10);
            --sidebar-width: 230px;
            --header-height: 60px;
        }

        body {
            background-color: var(--surface-0);
            color: var(--text-1);
            min-height: 100dvh;
            margin: 0;
            font-weight: 400;
            line-height: 1.5;
            display: flex;
            overflow: hidden;
            height: 100dvh;
        }

        ::-webkit-scrollbar {
            width: 4px;
            height: 4px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--surface-4);
            border-radius: 9999px;
        }

        /* ============================================================
               SIDEBAR
            ============================================================ */
        .sidebar {
            width: var(--sidebar-width);
            background: var(--surface-1);
            border-right: 1px solid var(--border);
            height: 100dvh;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            position: sticky;
            top: 0;
            overflow-y: auto;
            padding: 18px 12px 18px 14px;
            z-index: 50;
            transition: transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        .sidebar .brand {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 4px 6px 16px 6px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 16px;
        }
        .sidebar .brand .logo {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: var(--accent-dim);
            border: 1px solid rgba(155, 140, 255, 0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .sidebar .brand .logo .material-symbols-outlined {
            font-size: 20px;
            color: var(--accent);
        }
        .sidebar .brand .brand-text h1 {
            font-size: 16px;
            font-weight: 800;
            color: var(--text-1);
            letter-spacing: -0.3px;
            line-height: 1.1;
        }
        .sidebar .brand .brand-text h1 span {
            color: var(--accent);
        }
        .sidebar .brand .brand-text p {
            font-size: 10px;
            color: var(--text-3);
            font-weight: 500;
            letter-spacing: 0.02em;
            margin: 0;
        }

        .sidebar .menu-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-3);
            padding: 10px 8px 4px;
            opacity: 0.5;
        }

        .sidebar .menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-radius: var(--radius-sm);
            color: var(--text-2);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
            text-decoration: none;
            border: none;
            background: transparent;
            width: 100%;
            text-align: left;
            position: relative;
        }
        .sidebar .menu-item:hover {
            background: var(--surface-2);
            color: var(--text-1);
        }
        .sidebar .menu-item.active {
            background: var(--accent-dim);
            color: var(--accent-light);
        }
        .sidebar .menu-item.active::before {
            content: '';
            position: absolute;
            left: -14px;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 20px;
            border-radius: 0 4px 4px 0;
            background: var(--accent);
        }
        .sidebar .menu-item .material-symbols-outlined {
            font-size: 18px;
            flex-shrink: 0;
        }
        .sidebar .menu-item .badge-menu {
            margin-left: auto;
            font-size: 9px;
            background: var(--surface-3);
            padding: 1px 8px;
            border-radius: 10px;
            color: var(--text-3);
            font-weight: 600;
        }
        .sidebar .sidebar-footer {
            margin-top: auto;
            padding-top: 12px;
            border-top: 1px solid var(--border);
        }

        /* ============================================================
               MAIN WRAP
            ============================================================ */
        .main-wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100dvh;
            overflow: hidden;
            background: var(--surface-0);
            min-width: 0;
        }

        /* ============================================================
               TOP HEADER
            ============================================================ */
        .top-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 24px;
            height: var(--header-height);
            background: var(--surface-1);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
            gap: 12px;
        }
        .top-header .left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .top-header .left .hamburger {
            display: none;
            background: none;
            border: none;
            color: var(--text-2);
            cursor: pointer;
            padding: 4px;
        }
        .top-header .left .hamburger .material-symbols-outlined {
            font-size: 24px;
        }
        .top-header .left .page-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--text-1);
        }
        .top-header .left .page-title .accent {
            color: var(--accent);
        }

        .top-header .right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        .top-header .right .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--income);
            display: inline-block;
            margin-right: 3px;
            animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
            0%,
            100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.4;
                transform: scale(0.85);
            }
        }

        .top-header .right .user-badge-header {
            font-size: 11px;
            color: var(--text-2);
            background: var(--surface-2);
            padding: 3px 12px;
            border-radius: 16px;
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .top-header .right .btn-logout {
            background: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--text-2);
            padding: 5px 14px;
            border-radius: var(--radius-sm);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.15s;
        }
        .top-header .right .btn-logout:hover {
            background: var(--surface-3);
            color: var(--text-1);
            border-color: var(--border-hover);
        }
        .top-header .right .btn-logout .material-symbols-outlined {
            font-size: 15px;
        }

        /* ============================================================
               TABS BAR
            ============================================================ */
        .tabs-bar {
            display: flex;
            gap: 2px;
            padding: 8px 24px 0;
            background: var(--surface-0);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
            overflow-x: auto;
        }
        .tabs-bar .tab {
            padding: 8px 14px 10px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-3);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.15s;
            white-space: nowrap;
            background: transparent;
            border-top: none;
            border-left: none;
            border-right: none;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .tabs-bar .tab:hover {
            color: var(--text-1);
        }
        .tabs-bar .tab.active {
            color: var(--accent-light);
            border-bottom-color: var(--accent);
        }
        .tabs-bar .tab .material-symbols-outlined {
            font-size: 16px;
        }

        /* ============================================================
               CONTENT PANEL
            ============================================================ */
        .content-panel {
            flex: 1;
            overflow-y: auto;
            padding: 16px 24px 24px;
        }

        /* ============================================================
               CARDS
            ============================================================ */
        .card {
            background: var(--surface-1);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 18px 20px;
            margin-bottom: 16px;
            transition: border-color 0.2s;
        }
        .card:hover {
            border-color: var(--border-hover);
        }

        /* ============================================================
               STATS ROW
            ============================================================ */
        .stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
            margin-bottom: 16px;
        }
        .stat-mini {
            background: var(--surface-1);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 12px 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: border-color 0.2s;
        }
        .stat-mini:hover {
            border-color: var(--border-hover);
        }
        .stat-mini .stat-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--accent-dim);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .stat-mini .stat-icon .material-symbols-outlined {
            font-size: 16px;
            color: var(--accent);
        }
        .stat-mini .stat-info .stat-number {
            font-size: 18px;
            font-weight: 800;
            color: var(--text-1);
            line-height: 1.1;
        }
        .stat-mini .stat-info .stat-label {
            font-size: 10px;
            color: var(--text-3);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        /* ============================================================
               TABLE
            ============================================================ */
        .table-wrap {
            overflow-x: auto;
            margin: 0 -4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        table th {
            text-align: left;
            padding: 10px 10px 8px 10px;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--text-3);
            border-bottom: 1px solid var(--border);
            white-space: nowrap;
        }
        table td {
            padding: 10px 10px;
            border-bottom: 1px solid var(--border);
            color: var(--text-2);
            vertical-align: middle;
        }
        table tr:hover td {
            background: var(--surface-2);
        }
        table td .user-id-cell {
            font-weight: 600;
            color: var(--text-1);
            font-family: 'Inter', monospace;
            background: var(--surface-0);
            padding: 1px 10px;
            border-radius: 4px;
            border: 1px solid var(--border);
            font-size: 11px;
            display: inline-block;
        }
        table td .status-badge {
            font-size: 10px;
            padding: 2px 12px;
            border-radius: 16px;
            font-weight: 600;
            letter-spacing: 0.02em;
            display: inline-block;
        }
        table td .status-badge.active {
            background: rgba(110, 231, 183, 0.08);
            color: var(--income);
            border: 1px solid rgba(110, 231, 183, 0.10);
        }
        table td .status-badge.inactive {
            background: rgba(248, 113, 113, 0.06);
            color: var(--expense);
            border: 1px solid rgba(248, 113, 113, 0.10);
        }
        table td .date-cell {
            font-size: 10px;
            color: var(--text-3);
            display: flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
        }
        table td .date-cell .material-symbols-outlined {
            font-size: 13px;
        }

        .table-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            margin-bottom: 12px;
        }
        .table-toolbar .search-wrap {
            flex: 1;
            min-width: 150px;
            position: relative;
        }
        .table-toolbar .search-wrap .material-symbols-outlined {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 16px;
            color: var(--text-3);
        }
        .table-toolbar .search-wrap input {
            background: var(--surface-0);
            border: 1.5px solid var(--border);
            color: var(--text-1);
            padding: 6px 10px 6px 34px;
            border-radius: var(--radius-sm);
            width: 100%;
            outline: none;
            font-size: 12px;
            transition: border-color 0.2s;
        }
        .table-toolbar .search-wrap input:focus {
            border-color: var(--accent);
        }
        .table-toolbar .search-wrap input::placeholder {
            color: var(--text-3);
        }

        .table-toolbar .filter-group {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            align-items: center;
        }
        .table-toolbar .filter-group select {
            background: var(--surface-0);
            border: 1.5px solid var(--border);
            color: var(--text-1);
            padding: 6px 28px 6px 10px;
            border-radius: var(--radius-sm);
            outline: none;
            font-size: 11px;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e9bb8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            min-width: 90px;
            font-size: 11px;
        }
        .table-toolbar .filter-group select:focus {
            border-color: var(--accent);
        }

        .btn {
            padding: 6px 14px;
            border-radius: var(--radius-sm);
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 11px;
            transition: all 0.15s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            text-decoration: none;
            white-space: nowrap;
        }
        .btn:active {
            transform: scale(0.96);
        }
        .btn .material-symbols-outlined {
            font-size: 15px;
        }

        .btn-primary {
            background: var(--accent);
            color: #0a0e1a;
        }
        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(155, 140, 255, 0.30);
        }

        .btn-secondary {
            background: var(--surface-2);
            color: var(--text-1);
            border: 1px solid var(--border);
        }
        .btn-secondary:hover {
            background: var(--surface-3);
            border-color: var(--border-hover);
        }

        .btn-danger {
            background: var(--expense);
            color: #0a0e1a;
        }
        .btn-danger:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(248, 113, 113, 0.25);
        }

        .btn-success {
            background: var(--income);
            color: #0a0e1a;
        }
        .btn-success:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(110, 231, 183, 0.25);
        }

        .btn-warning {
            background: var(--warning);
            color: #0a0e1a;
        }
        .btn-warning:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(251, 191, 36, 0.25);
        }

        .btn-sm {
            padding: 3px 10px;
            font-size: 10px;
        }
        .btn-sm .material-symbols-outlined {
            font-size: 13px;
        }
        .btn-ghost {
            background: transparent;
            color: var(--text-2);
            border: 1px solid transparent;
        }
        .btn-ghost:hover {
            background: var(--surface-2);
            border-color: var(--border);
            color: var(--text-1);
        }

        /* ============================================================
               TOAST
            ============================================================ */
        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: var(--surface-2);
            color: var(--text-1);
            padding: 10px 24px;
            border-radius: 32px;
            font-weight: 500;
            font-size: 12px;
            border: 1px solid var(--border);
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 999;
            pointer-events: none;
            white-space: nowrap;
            max-width: 90vw;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        /* ============================================================
               LOGIN OVERLAY
            ============================================================ */
        .login-overlay {
            position: fixed;
            inset: 0;
            background: var(--surface-0);
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            transition: opacity 0.4s, transform 0.4s;
        }
        .login-overlay.hidden {
            opacity: 0;
            transform: scale(0.96);
            pointer-events: none;
        }
        .login-box {
            background: var(--surface-1);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 30px 32px 28px;
            max-width: 400px;
            width: 100%;
            box-shadow: var(--shadow-card);
        }
        .login-box .login-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--accent-dim);
            border: 1px solid rgba(155, 140, 255, 0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
        }
        .login-box .login-icon .material-symbols-outlined {
            font-size: 24px;
            color: var(--accent);
        }
        .login-box h2 {
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            color: var(--text-1);
            margin-bottom: 2px;
        }
        .login-box p.sub {
            font-size: 12px;
            color: var(--text-2);
            text-align: center;
            margin-bottom: 16px;
        }
        .login-box .token-input {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .login-box .token-input input {
            flex: 1;
            min-width: 120px;
            background: var(--surface-0);
            border: 1.5px solid var(--border);
            color: var(--text-1);
            padding: 8px 14px;
            border-radius: var(--radius-sm);
            outline: none;
            font-size: 13px;
            transition: border-color 0.2s;
        }
        .login-box .token-input input:focus {
            border-color: var(--accent);
        }
        .login-box .token-input input::placeholder {
            color: var(--text-3);
        }
        .login-box .status-text {
            font-size: 11px;
            color: var(--text-2);
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 5px;
            min-height: 22px;
        }
        .login-box .status-text.success {
            color: var(--income);
        }
        .login-box .status-text.error {
            color: var(--expense);
        }
        .login-box .status-text.loading {
            color: var(--warning);
        }
        .login-box .hint {
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid var(--border);
            font-size: 10px;
            color: var(--text-3);
            text-align: center;
        }
        .login-box .hint code {
            background: var(--surface-2);
            padding: 1px 8px;
            border-radius: 4px;
            font-size: 10px;
            color: var(--text-2);
        }

        /* ============================================================
               PAGINATION
            ============================================================ */
        .pagination {
            display: flex;
            justify-content: center;
            gap: 3px;
            margin-top: 12px;
            flex-wrap: wrap;
        }
        .pagination .page-btn {
            padding: 4px 11px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border);
            background: var(--surface-2);
            color: var(--text-2);
            cursor: pointer;
            font-weight: 500;
            font-size: 11px;
            transition: all 0.15s;
            min-width: 28px;
            text-align: center;
        }
        .pagination .page-btn:hover:not(.disabled) {
            background: var(--surface-3);
            border-color: var(--border-hover);
            color: var(--text-1);
        }
        .pagination .page-btn.active {
            background: var(--accent);
            color: #0a0e1a;
            border-color: var(--accent);
        }
        .pagination .page-btn.disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        /* ============================================================
               MODAL
            ============================================================ */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 200;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .modal-overlay.active {
            display: flex;
        }
        .modal-box {
            background: var(--surface-1);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            max-width: 600px;
            width: 100%;
            max-height: 85vh;
            overflow-y: auto;
            padding: 0 20px 20px;
            animation: modalUp 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        @keyframes modalUp {
            from {
                transform: scale(0.95) translateY(16px);
                opacity: 0;
            }
            to {
                transform: scale(1) translateY(0);
                opacity: 1;
            }
        }
        .modal-box .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0 12px;
            position: sticky;
            top: 0;
            background: var(--surface-1);
            z-index: 2;
            border-bottom: 1px solid var(--border);
            margin-bottom: 14px;
        }
        .modal-box .modal-header h2 {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-1);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .modal-box .modal-header h2 .material-symbols-outlined {
            color: var(--accent);
        }
        .modal-box .modal-header .close-modal {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--text-2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.15s;
        }
        .modal-box .modal-header .close-modal:hover {
            background: var(--surface-3);
            color: var(--text-1);
        }
        .modal-box .modal-body {
            color: var(--text-2);
            font-size: 13px;
            line-height: 1.6;
        }
        .modal-box .modal-body .form-group {
            margin-bottom: 12px;
        }
        .modal-box .modal-body .form-group label {
            display: block;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-2);
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .modal-box .modal-body .form-group input,
        .modal-box .modal-body .form-group select,
        .modal-box .modal-body .form-group textarea {
            width: 100%;
            background: var(--surface-0);
            border: 1.5px solid var(--border);
            color: var(--text-1);
            padding: 7px 12px;
            border-radius: var(--radius-sm);
            outline: none;
            font-size: 13px;
            transition: border-color 0.2s;
        }
        .modal-box .modal-body .form-group input:focus,
        .modal-box .modal-body .form-group select:focus,
        .modal-box .modal-body .form-group textarea:focus {
            border-color: var(--accent);
        }
        .modal-box .modal-body .form-group textarea {
            resize: vertical;
            min-height: 60px;
        }
        .modal-box .modal-body .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .modal-box .modal-body .form-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--border);
        }

        .modal-box .modal-body .tx-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
            border-radius: 6px;
            transition: background 0.15s;
        }
        .modal-box .modal-body .tx-item:hover {
            background: var(--surface-2);
        }
        .modal-box .modal-body .tx-item:last-child {
            border-bottom: none;
        }
        .modal-box .modal-body .tx-item .tx-amount.income {
            color: var(--income);
            font-weight: 600;
        }
        .modal-box .modal-body .tx-item .tx-amount.expense {
            color: var(--expense);
            font-weight: 600;
        }
        .modal-box .modal-body .tx-item .tx-actions {
            display: flex;
            gap: 4px;
        }
        .modal-box .modal-body .tx-empty {
            text-align: center;
            padding: 28px 0;
            color: var(--text-3);
        }
        .modal-box .modal-body .tx-empty .material-symbols-outlined {
            font-size: 36px;
            display: block;
            margin-bottom: 6px;
            opacity: 0.4;
        }
        .modal-box .modal-body .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin-bottom: 14px;
        }
        .modal-box .modal-body .summary-grid .sum-item {
            background: var(--surface-2);
            padding: 10px;
            border-radius: var(--radius-sm);
            text-align: center;
            border: 1px solid var(--border);
        }
        .modal-box .modal-body .summary-grid .sum-item .sum-label {
            font-size: 9px;
            font-weight: 600;
            color: var(--text-3);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .modal-box .modal-body .summary-grid .sum-item .sum-value {
            font-size: 17px;
            font-weight: 800;
            margin-top: 2px;
        }
        .modal-box .modal-body .summary-grid .sum-item .sum-value.accent {
            color: var(--accent);
        }
        .modal-box .modal-body .summary-grid .sum-item .sum-value.income {
            color: var(--income);
        }
        .modal-box .modal-body .summary-grid .sum-item .sum-value.expense {
            color: var(--expense);
        }

        /* ============================================================
               TOGGLE SWITCH
            ============================================================ */
        .toggle-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: var(--text-2);
        }
        .toggle-switch {
            width: 32px;
            height: 16px;
            background: var(--surface-3);
            border-radius: 16px;
            cursor: pointer;
            position: relative;
            transition: background 0.25s;
            flex-shrink: 0;
            border: 1px solid var(--border);
        }
        .toggle-switch.active {
            background: var(--accent);
        }
        .toggle-switch::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--text-1);
            transition: transform 0.25s;
        }
        .toggle-switch.active::after {
            transform: translateX(16px);
            background: #0a0e1a;
        }

        /* ============================================================
               BADGE COUNT
            ============================================================ */
        .badge-count {
            font-size: 10px;
            background: var(--surface-2);
            padding: 1px 10px;
            border-radius: 16px;
            font-weight: 600;
            color: var(--text-2);
            border: 1px solid var(--border);
        }

        /* ============================================================
               FOOTER
            ============================================================ */
        .footer-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: var(--text-3);
            padding: 10px 0 2px;
            border-top: 1px solid var(--border);
            margin-top: 6px;
            flex-wrap: wrap;
            gap: 6px;
        }
        .footer-bar .dot {
            color: var(--text-3);
            opacity: 0.3;
        }
        .footer-bar .material-symbols-outlined {
            font-size: 13px;
            vertical-align: middle;
        }

        /* ============================================================
               EMPTY STATE
            ============================================================ */
        .empty-state {
            text-align: center;
            padding: 32px 16px 20px;
            color: var(--text-3);
        }
        .empty-state .material-symbols-outlined {
            font-size: 36px;
            display: block;
            margin-bottom: 8px;
            opacity: 0.4;
        }

        /* ============================================================
               CHECKBOX
            ============================================================ */
        .checkbox-custom {
            width: 16px;
            height: 16px;
            accent-color: var(--accent);
            cursor: pointer;
            background: var(--surface-0);
            border: 1.5px solid var(--border);
            border-radius: 4px;
        }
        .checkbox-custom:checked {
            background: var(--accent);
            border-color: var(--accent);
        }

        /* ============================================================
               RESPONSIVE
            ============================================================ */
        @media (max-width: 900px) {
            .stats-row {
                grid-template-columns: repeat(2, 1fr);
            }
            .modal-box .modal-body .form-row {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                top: 0;
                left: 0;
                bottom: 0;
                transform: translateX(-100%);
                width: 250px;
                z-index: 60;
                box-shadow: 4px 0 30px rgba(0, 0, 0, 0.6);
            }
            .sidebar.open {
                transform: translateX(0);
            }
            .sidebar-overlay {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 55;
            }
            .sidebar-overlay.active {
                display: block;
            }
            .top-header .left .hamburger {
                display: flex;
            }
            .top-header {
                padding: 0 12px;
            }
            .content-panel {
                padding: 12px 12px 16px;
            }
            .tabs-bar {
                padding: 6px 12px 0;
                gap: 1px;
            }
            .tabs-bar .tab {
                font-size: 11px;
                padding: 6px 10px 8px;
            }
            .stats-row {
                grid-template-columns: 1fr 1fr;
                gap: 6px;
            }
            .stat-mini {
                padding: 8px 10px;
            }
            .stat-mini .stat-info .stat-number {
                font-size: 15px;
            }
            .table-toolbar {
                flex-direction: column;
                align-items: stretch;
            }
            .table-toolbar .filter-group {
                justify-content: flex-start;
                flex-wrap: wrap;
            }
            .modal-box {
                padding: 0 14px 14px;
                margin: 4px;
            }
            .modal-box .modal-body .summary-grid {
                grid-template-columns: 1fr 1fr;
            }
            .login-box {
                padding: 20px 16px 20px;
            }
            table td,
            table th {
                padding: 6px 6px;
                font-size: 11px;
            }
            .card {
                padding: 12px 12px;
            }
        }

        @media (max-width: 480px) {
            .stats-row {
                grid-template-columns: 1fr 1fr;
                gap: 4px;
            }
            .stat-mini .stat-info .stat-number {
                font-size: 13px;
            }
            .top-header .left .page-title {
                font-size: 13px;
            }
            .top-header .right .user-badge-header {
                display: none;
            }
            .modal-box .modal-body .form-row {
                grid-template-columns: 1fr;
            }
        }

        .fade-in {
            animation: fadeIn 0.3s ease forwards;
            opacity: 0;
        }
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(6px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Activity log styling */
        .log-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 10px;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
            border-radius: 4px;
            transition: background 0.15s;
        }
        .log-item:hover {
            background: var(--surface-2);
        }
        .log-item .log-time {
            font-size: 10px;
            color: var(--text-3);
            min-width: 60px;
            flex-shrink: 0;
        }
        .log-item .log-icon {
            font-size: 16px;
            flex-shrink: 0;
        }
        .log-item .log-text {
            color: var(--text-2);
            flex: 1;
        }
        .log-item .log-text strong {
            color: var(--text-1);
            font-weight: 600;
        }
        .log-item .log-badge {
            font-size: 9px;
            padding: 1px 8px;
            border-radius: 10px;
            font-weight: 600;
            flex-shrink: 0;
        }
        .log-item .log-badge.success {
            background: rgba(110, 231, 183, 0.08);
            color: var(--income);
        }
        .log-item .log-badge.danger {
            background: rgba(248, 113, 113, 0.08);
            color: var(--expense);
        }
        .log-item .log-badge.warning {
            background: rgba(251, 191, 36, 0.08);
            color: var(--warning);
        }
        .log-item .log-badge.info {
            background: rgba(155, 140, 255, 0.08);
            color: var(--accent-light);
        }

        /* Bulk actions bar */
        .bulk-bar {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: var(--surface-2);
            border-radius: var(--radius-sm);
            border: 1px solid var(--border);
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        .bulk-bar.active {
            display: flex;
        }
        .bulk-bar .bulk-info {
            font-size: 12px;
            color: var(--text-2);
        }
        .bulk-bar .bulk-info strong {
            color: var(--text-1);
        }
    </style>
</head>
<body>

    <!-- ===== TOAST ===== -->
    <div id="toast" class="toast"></div>

    <!-- ============================================================
    SIDEBAR OVERLAY (mobile)
    ============================================================ -->
    <div id="sidebar-overlay" class="sidebar-overlay" onclick="closeSidebar()"></div>

    <!-- ============================================================
    SIDEBAR
    ============================================================ -->
    <aside class="sidebar" id="sidebar">
        <div class="brand">
            <div class="logo"><span class="material-symbols-outlined">admin_panel_settings</span></div>
            <div class="brand-text">
                <h1>Catatan<span>Ku</span></h1>
                <p>Admin Panel</p>
            </div>
        </div>

        <div class="menu-label">Menu</div>
        <button class="menu-item active" data-tab="dashboard" onclick="switchTab('dashboard')">
            <span class="material-symbols-outlined">dashboard</span> Dashboard
            <span class="badge-menu" id="sidebar-user-count">0</span>
        </button>
        <button class="menu-item" data-tab="users" onclick="switchTab('users')">
            <span class="material-symbols-outlined">people</span> User Management
            <span class="badge-menu" id="sidebar-user-count2">0</span>
        </button>
        <button class="menu-item" data-tab="transactions" onclick="switchTab('transactions')">
            <span class="material-symbols-outlined">receipt_long</span> All Transactions
        </button>
        <button class="menu-item" data-tab="activity" onclick="switchTab('activity')">
            <span class="material-symbols-outlined">history</span> Activity Log
        </button>

        <div class="menu-label" style="margin-top:4px;">Tools</div>
        <button class="menu-item" onclick="openImportModal()">
            <span class="material-symbols-outlined">upload_file</span> Import Data
        </button>
        <button class="menu-item" onclick="exportCSV()">
            <span class="material-symbols-outlined">download</span> Export CSV
        </button>

        <div class="sidebar-footer">
            <button class="menu-item" onclick="logoutAdmin()">
                <span class="material-symbols-outlined">logout</span> Keluar
            </button>
        </div>
    </aside>

    <!-- ============================================================
    MAIN WRAP
    ============================================================ -->
    <div class="main-wrap">

        <!-- TOP HEADER -->
        <header class="top-header">
            <div class="left">
                <button class="hamburger" onclick="toggleSidebar()">
                    <span class="material-symbols-outlined">menu</span>
                </button>
                <span class="page-title" id="page-title">Admin <span class="accent">Panel</span></span>
            </div>
            <div class="right" id="header-actions" style="display:none;">
                <span class="user-badge-header">
                    <span class="status-dot"></span>
                    <span id="header-user-count">0</span> user
                </span>
                <button class="btn-logout" onclick="logoutAdmin()">
                    <span class="material-symbols-outlined">logout</span> Keluar
                </button>
            </div>
        </header>

        <!-- TABS BAR -->
        <div class="tabs-bar" id="tabs-bar" style="display:none;">
            <button class="tab active" data-tab="dashboard" onclick="switchTab('dashboard')">
                <span class="material-symbols-outlined">dashboard</span> Dashboard
            </button>
            <button class="tab" data-tab="users" onclick="switchTab('users')">
                <span class="material-symbols-outlined">people</span> Users
            </button>
            <button class="tab" data-tab="transactions" onclick="switchTab('transactions')">
                <span class="material-symbols-outlined">receipt_long</span> Transactions
            </button>
            <button class="tab" data-tab="activity" onclick="switchTab('activity')">
                <span class="material-symbols-outlined">history</span> Activity
            </button>
        </div>

        <!-- ============================================================
        CONTENT PANEL
        ============================================================ -->
        <div class="content-panel" id="content-panel" style="display:none;">

            <!-- ==========================================================
            TAB: DASHBOARD
            ========================================================== -->
            <div id="tab-dashboard" class="tab-content">
                <div class="stats-row" id="stats-row">
                    <div class="stat-mini fade-in">
                        <div class="stat-icon"><span class="material-symbols-outlined">people</span></div>
                        <div class="stat-info">
                            <div class="stat-number" id="stat-users">0</div>
                            <div class="stat-label">Total User</div>
                        </div>
                    </div>
                    <div class="stat-mini fade-in">
                        <div class="stat-icon"><span class="material-symbols-outlined">receipt_long</span></div>
                        <div class="stat-info">
                            <div class="stat-number" id="stat-transactions">0</div>
                            <div class="stat-label">Total Transaksi</div>
                        </div>
                    </div>
                    <div class="stat-mini fade-in">
                        <div class="stat-icon"><span class="material-symbols-outlined">check_circle</span></div>
                        <div class="stat-info">
                            <div class="stat-number" id="stat-active">0</div>
                            <div class="stat-label">User Aktif</div>
                        </div>
                    </div>
                    <div class="stat-mini fade-in">
                        <div class="stat-icon"><span class="material-symbols-outlined">trending_up</span></div>
                        <div class="stat-info">
                            <div class="stat-number" id="stat-avg">0</div>
                            <div class="stat-label">Rata-rata Tx / User</div>
                        </div>
                    </div>
                    <div class="stat-mini fade-in">
                        <div class="stat-icon"><span class="material-symbols-outlined">attach_money</span></div>
                        <div class="stat-info">
                            <div class="stat-number" id="stat-income">Rp0</div>
                            <div class="stat-label">Total Pemasukan</div>
                        </div>
                    </div>
                    <div class="stat-mini fade-in">
                        <div class="stat-icon"><span class="material-symbols-outlined">money_off</span></div>
                        <div class="stat-info">
                            <div class="stat-number" id="stat-expense">Rp0</div>
                            <div class="stat-label">Total Pengeluaran</div>
                        </div>
                    </div>
                </div>

                <div class="card fade-in">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <span style="font-weight:700;font-size:14px;color:var(--text-1);">📊 Ringkasan Cepat</span>
                        <button class="btn btn-secondary btn-sm" onclick="loadUsers()">
                            <span class="material-symbols-outlined">refresh</span> Refresh
                        </button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div style="background:var(--surface-2);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);">
                            <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;">User dengan Tx Terbanyak</div>
                            <div id="top-user" style="font-size:14px;font-weight:700;color:var(--text-1);margin-top:4px;">—</div>
                        </div>
                        <div style="background:var(--surface-2);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);">
                            <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;">User dengan Tx Terendah</div>
                            <div id="bottom-user" style="font-size:14px;font-weight:700;color:var(--text-1);margin-top:4px;">—</div>
                        </div>
                    </div>
                    <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;" id="category-breakdown">
                        <div style="background:var(--surface-2);padding:10px 14px;border-radius:var(--radius-sm);text-align:center;border:1px solid var(--border);">
                            <div style="font-size:9px;color:var(--text-3);text-transform:uppercase;">Makanan</div>
                            <div id="cat-food" style="font-size:14px;font-weight:700;color:var(--income);">0</div>
                        </div>
                        <div style="background:var(--surface-2);padding:10px 14px;border-radius:var(--radius-sm);text-align:center;border:1px solid var(--border);">
                            <div style="font-size:9px;color:var(--text-3);text-transform:uppercase;">Transport</div>
                            <div id="cat-transport" style="font-size:14px;font-weight:700;color:var(--warning);">0</div>
                        </div>
                        <div style="background:var(--surface-2);padding:10px 14px;border-radius:var(--radius-sm);text-align:center;border:1px solid var(--border);">
                            <div style="font-size:9px;color:var(--text-3);text-transform:uppercase;">Lainnya</div>
                            <div id="cat-other" style="font-size:14px;font-weight:700;color:var(--accent-light);">0</div>
                        </div>
                    </div>
                </div>

                <div class="card fade-in">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                        <span style="font-weight:700;font-size:14px;color:var(--text-1);">🕐 Aktivitas Terbaru</span>
                    </div>
                    <div id="recent-activity" style="max-height:200px;overflow-y:auto;">
                        <div style="text-align:center;padding:16px 0;color:var(--text-3);font-size:12px;">Belum ada aktivitas</div>
                    </div>
                </div>
            </div>

            <!-- ==========================================================
            TAB: USERS
            ========================================================== -->
            <div id="tab-users" class="tab-content" style="display:none;">
                <div class="card">
                    <!-- Header -->
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:18px;color:var(--accent);">people</span>
                            <span style="font-weight:700;font-size:14px;color:var(--text-1);">Daftar User</span>
                            <span class="badge-count" id="user-count-badge">0</span>
                        </div>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;">
                            <button class="btn btn-primary btn-sm" onclick="openAddUserModal()">
                                <span class="material-symbols-outlined">add</span> Tambah User
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="exportCSV()">
                                <span class="material-symbols-outlined">download</span> Export
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="loadUsers()">
                                <span class="material-symbols-outlined">refresh</span> Refresh
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="clearAllUsers()">
                                <span class="material-symbols-outlined">delete_sweep</span> Hapus Semua
                            </button>
                        </div>
                    </div>

                    <!-- Bulk Actions -->
                    <div class="bulk-bar" id="bulk-bar">
                        <span class="bulk-info"><strong id="bulk-count">0</strong> user dipilih</span>
                        <button class="btn btn-danger btn-sm" onclick="bulkDeleteUsers()">
                            <span class="material-symbols-outlined">delete</span> Hapus
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="bulkToggleStatus(true)">
                            <span class="material-symbols-outlined">check_circle</span> Aktifkan
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="bulkToggleStatus(false)">
                            <span class="material-symbols-outlined">block</span> Nonaktifkan
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="clearBulkSelection()">
                            Batal
                        </button>
                    </div>

                    <!-- Toolbar -->
                    <div class="table-toolbar">
                        <div class="search-wrap">
                            <span class="material-symbols-outlined">search</span>
                            <input id="search-input" type="text" placeholder="Cari User ID..." oninput="applyFilters()" />
                        </div>
                        <div class="filter-group">
                            <select id="sort-select" onchange="applyFilters()">
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                                <option value="most-tx">Tx Terbanyak</option>
                                <option value="least-tx">Tx Tersedikit</option>
                            </select>
                            <select id="status-filter" onchange="applyFilters()">
                                <option value="all">Semua Status</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                            <div class="toggle-wrap">
                                <span>Auto Refresh</span>
                                <div class="toggle-switch active" id="auto-refresh-toggle" onclick="toggleAutoRefresh()"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Table -->
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:24px;"><input type="checkbox" id="select-all" class="checkbox-custom" onchange="toggleAllUsers()" /></th>
                                    <th>#</th>
                                    <th>User ID</th>
                                    <th style="text-align:center;">Tx</th>
                                    <th style="text-align:center;">Status</th>
                                    <th style="text-align:center;">Registered</th>
                                    <th style="text-align:center;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="user-table-body">
                                <tr><td colspan="7" style="text-align:center;padding:28px 0;color:var(--text-3);">
                                        <span class="material-symbols-outlined" style="font-size:28px;display:block;margin-bottom:6px;">sync</span> Memuat data...
                                </td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div class="pagination" id="pagination-container"></div>

                    <!-- Footer -->
                    <div class="footer-bar">
                        <span><span class="material-symbols-outlined">security</span> Data tersimpan di Vercel KV</span>
                        <span class="dot">•</span>
                        <span id="last-refresh">Terakhir: —</span>
                        <span class="dot">•</span>
                        <span><span class="material-symbols-outlined">schedule</span> <span id="auto-refresh-status">Auto Refresh: Aktif</span></span>
                    </div>
                </div>
            </div>

            <!-- ==========================================================
            TAB: ALL TRANSACTIONS
            ========================================================== -->
            <div id="tab-transactions" class="tab-content" style="display:none;">
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:18px;color:var(--accent);">receipt_long</span>
                            <span style="font-weight:700;font-size:14px;color:var(--text-1);">Semua Transaksi</span>
                            <span class="badge-count" id="tx-count-badge">0</span>
                        </div>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;">
                            <button class="btn btn-primary btn-sm" onclick="openAddTxModal()">
                                <span class="material-symbols-outlined">add</span> Tambah Transaksi
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="exportTxCSV()">
                                <span class="material-symbols-outlined">download</span> Export
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="loadAllTransactions()">
                                <span class="material-symbols-outlined">refresh</span> Refresh
                            </button>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="table-toolbar">
                        <div class="search-wrap">
                            <span class="material-symbols-outlined">search</span>
                            <input id="tx-search-input" type="text" placeholder="Cari user ID atau note..." oninput="applyTxFilters()" />
                        </div>
                        <div class="filter-group">
                            <select id="tx-type-filter" onchange="applyTxFilters()">
                                <option value="all">Semua Tipe</option>
                                <option value="income">Pemasukan</option>
                                <option value="expense">Pengeluaran</option>
                            </select>
                            <input type="date" id="tx-date-from" style="background:var(--surface-0);border:1.5px solid var(--border);color:var(--text-1);padding:5px 10px;border-radius:var(--radius-sm);font-size:11px;outline:none;" onchange="applyTxFilters()" />
                            <span style="font-size:11px;color:var(--text-3);">s/d</span>
                            <input type="date" id="tx-date-to" style="background:var(--surface-0);border:1.5px solid var(--border);color:var(--text-1);padding:5px 10px;border-radius:var(--radius-sm);font-size:11px;outline:none;" onchange="applyTxFilters()" />
                        </div>
                    </div>

                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>User ID</th>
                                    <th>Tanggal</th>
                                    <th>Kategori</th>
                                    <th>Note</th>
                                    <th style="text-align:right;">Jumlah</th>
                                    <th style="text-align:center;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="tx-table-body">
                                <tr><td colspan="7" style="text-align:center;padding:28px 0;color:var(--text-3);">
                                        <span class="material-symbols-outlined" style="font-size:28px;display:block;margin-bottom:6px;">sync</span> Memuat transaksi...
                                </td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="pagination" id="tx-pagination-container"></div>
                </div>
            </div>

            <!-- ==========================================================
            TAB: ACTIVITY LOG
            ========================================================== -->
            <div id="tab-activity" class="tab-content" style="display:none;">
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:18px;color:var(--accent);">history</span>
                            <span style="font-weight:700;font-size:14px;color:var(--text-1);">Log Aktivitas Admin</span>
                            <span class="badge-count" id="log-count-badge">0</span>
                        </div>
                        <div style="display:flex;gap:4px;">
                            <button class="btn btn-secondary btn-sm" onclick="clearLogs()">
                                <span class="material-symbols-outlined">delete_sweep</span> Hapus Log
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="exportLogsCSV()">
                                <span class="material-symbols-outlined">download</span> Export
                            </button>
                        </div>
                    </div>
                    <div id="log-list" style="max-height:400px;overflow-y:auto;">
                        <div style="text-align:center;padding:24px 0;color:var(--text-3);font-size:12px;">Belum ada log aktivitas</div>
                    </div>
                </div>
            </div>

        </div><!-- /content-panel -->
    </div><!-- /main-wrap -->

    <!-- ============================================================
    LOGIN OVERLAY
    ============================================================ -->
    <div class="login-overlay" id="login-overlay">
        <div class="login-box">
            <div class="login-icon"><span class="material-symbols-outlined">lock</span></div>
            <h2>Autentikasi Admin</h2>
            <p class="sub">Masukkan token admin untuk mengakses panel</p>
            <div class="token-input">
                <input id="admin-token" type="password" placeholder="Masukkan token admin..." onkeydown="if(event.key==='Enter') loginAdmin()" />
                <button class="btn btn-primary" onclick="loginAdmin()"><span class="material-symbols-outlined">login</span> Login</button>
            </div>
            <div id="login-status" class="status-text"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--text-3);"></span> Siap untuk login</div>
            <div class="hint"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">info</span> Token admin diatur di environment variable <code>ADMIN_TOKEN</code></div>
        </div>
    </div>

    <!-- ============================================================
    MODAL: USER DETAIL
    ============================================================ -->
    <div id="detail-modal" class="modal-overlay">
        <div class="modal-box">
            <div class="modal-header">
                <h2><span class="material-symbols-outlined">person</span> <span id="modal-user-title">Detail User</span></h2>
                <button class="close-modal" onclick="closeDetailModal()">✕</button>
            </div>
            <div class="modal-body" id="modal-body-content">
                <div style="text-align:center;padding:24px 0;color:var(--text-3);">
                    <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">sync</span> Memuat...
                </div>
            </div>
        </div>
    </div>

    <!-- ============================================================
    MODAL: ADD / EDIT USER
    ============================================================ -->
    <div id="user-modal" class="modal-overlay">
        <div class="modal-box">
            <div class="modal-header">
                <h2><span class="material-symbols-outlined">person_add</span> <span id="user-modal-title">Tambah User</span></h2>
                <button class="close-modal" onclick="closeUserModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="user-form" onsubmit="submitUserForm(event)">
                    <input type="hidden" id="user-form-id" value="" />
                    <div class="form-group">
                        <label>User ID</label>
                        <input type="text" id="user-form-userid" placeholder="Masukkan User ID..." required />
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="user-form-status">
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeUserModal()">Batal</button>
                        <button type="submit" class="btn btn-primary"><span class="material-symbols-outlined">save</span> Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- ============================================================
    MODAL: ADD / EDIT TRANSACTION
    ============================================================ -->
    <div id="tx-modal" class="modal-overlay">
        <div class="modal-box">
            <div class="modal-header">
                <h2><span class="material-symbols-outlined">receipt_long</span> <span id="tx-modal-title">Tambah Transaksi</span></h2>
                <button class="close-modal" onclick="closeTxModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="tx-form" onsubmit="submitTxForm(event)">
                    <input type="hidden" id="tx-form-id" value="" />
                    <div class="form-group">
                        <label>User ID</label>
                        <input type="text" id="tx-form-userid" placeholder="Masukkan User ID..." required list="user-list-datalist" />
                        <datalist id="user-list-datalist"></datalist>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipe</label>
                            <select id="tx-form-type" required>
                                <option value="income">Pemasukan</option>
                                <option value="expense">Pengeluaran</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Jumlah (Rp)</label>
                            <input type="number" id="tx-form-amount" placeholder="0" min="0" required />
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Kategori</label>
                        <select id="tx-form-category">
                            <option value="Makanan">Makanan</option>
                            <option value="Transport">Transport</option>
                            <option value="Belanja">Belanja</option>
                            <option value="Tagihan">Tagihan</option>
                            <option value="Hiburan">Hiburan</option>
                            <option value="Kesehatan">Kesehatan</option>
                            <option value="Pendidikan">Pendidikan</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tanggal</label>
                        <input type="date" id="tx-form-date" required />
                    </div>
                    <div class="form-group">
                        <label>Catatan</label>
                        <textarea id="tx-form-note" placeholder="Catatan tambahan..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeTxModal()">Batal</button>
                        <button type="submit" class="btn btn-primary"><span class="material-symbols-outlined">save</span> Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- ============================================================
    MODAL: IMPORT DATA
    ============================================================ -->
    <div id="import-modal" class="modal-overlay">
        <div class="modal-box">
            <div class="modal-header">
                <h2><span class="material-symbols-outlined">upload_file</span> Import Data</h2>
                <button class="close-modal" onclick="closeImportModal()">✕</button>
            </div>
            <div class="modal-body">
                <p style="font-size:12px;color:var(--text-2);margin-bottom:12px;">Upload file CSV dengan format: <strong>userId,type,amount,category,note,date</strong></p>
                <div class="form-group">
                    <label>Pilih File CSV</label>
                    <input type="file" id="import-file" accept=".csv" style="padding:8px;background:var(--surface-0);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text-1);width:100%;" />
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeImportModal()">Batal</button>
                    <button type="button" class="btn btn-primary" onclick="importCSV()"><span class="material-symbols-outlined">upload</span> Import</button>
                </div>
                <div id="import-status" style="margin-top:10px;font-size:12px;color:var(--text-2);"></div>
            </div>
        </div>
    </div>


    <!-- ============================================================
    JAVASCRIPT — FULL FEATURES (dengan tambahan Export PDF)
    ============================================================ -->
    <script>
        // ============================================================
        // CONFIG & STATE
        // ============================================================
        const API_BASE = window.location.origin;
        let adminToken = '';
        let allUsers = [];
        let filteredUsers = [];
        let currentPage = 1;
        const pageSize = 10;
        let autoRefreshInterval = null;
        let isAutoRefresh = true;

        // Transaction state
        let allTransactions = [];
        let filteredTx = [];
        let txPage = 1;
        const txPageSize = 15;

        // Activity log
        let activityLogs = [];
        let selectedUsers = new Set();

        // ============================================================
        // TOAST
        // ============================================================
        function showToast(msg) {
            const el = document.getElementById('toast');
            el.textContent = msg;
            el.classList.add('show');
            clearTimeout(window.toastTimeout);
            window.toastTimeout = setTimeout(() => el.classList.remove('show'), 3000);
        }

        // ============================================================
        // SIDEBAR
        // ============================================================
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebar-overlay').classList.toggle('active');
        }

        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-overlay').classList.remove('active');
        }

        // ============================================================
        // LOGIN — dengan penanganan error lebih baik
        // ============================================================
        function setStatus(msg, type = '') {
            const el = document.getElementById('login-status');
            el.innerHTML = msg;
            el.className = 'status-text ' + type;
        }

        function loginAdmin() {
            const input = document.getElementById('admin-token');
            const token = input.value.trim();
            if (!token) {
                showToast('⚠️ Masukkan token admin');
                setStatus('⚠️ Masukkan token admin', 'error');
                return;
            }
            adminToken = token;
            setStatus('⏳ Memverifikasi...', 'loading');
            
            fetch(`${API_BASE}/api/admin/users`, {
                headers: { 'x-admin-token': adminToken }
            })
            .then(async res => {
                if (!res.ok) {
                    let errorMsg = 'Gagal verifikasi';
                    try {
                        const data = await res.json();
                        if (data.error) errorMsg = data.error;
                    } catch (e) {}
                    throw new Error(errorMsg);
                }
                return res.json();
            })
            .then(data => {
                sessionStorage.setItem('admin_token', adminToken);
                setStatus('✅ Login berhasil!', 'success');
                document.getElementById('login-overlay').classList.add('hidden');
                document.getElementById('tabs-bar').style.display = 'flex';
                document.getElementById('content-panel').style.display = 'block';
                document.getElementById('header-actions').style.display = 'flex';
                allUsers = data.users || [];
                applyFilters();
                updateStats(allUsers);
                loadAllTransactions();
                loadActivityLog();
                showToast('✅ Selamat datang, Admin!');
                document.getElementById('last-refresh').textContent = 'Terakhir: ' + new Date().toLocaleTimeString('id-ID');
                document.getElementById('auto-refresh-status').textContent = 'Auto Refresh: Aktif';
                if (isAutoRefresh) startAutoRefresh();
                closeSidebar();
                switchTab('dashboard');
                addLog('login', 'Admin login');
            })
            .catch(err => {
                setStatus('❌ ' + err.message, 'error');
                adminToken = '';
                input.focus();
                showToast('❌ ' + err.message);
            });
        }

        function logoutAdmin() {
            stopAutoRefresh();
            sessionStorage.removeItem('admin_token');
            adminToken = '';
            document.getElementById('content-panel').style.display = 'none';
            document.getElementById('tabs-bar').style.display = 'none';
            document.getElementById('header-actions').style.display = 'none';
            document.getElementById('login-overlay').classList.remove('hidden');
            setStatus('👋 Sesi berakhir, login kembali.', '');
            document.getElementById('admin-token').value = '';
            document.getElementById('admin-token').focus();
            showToast('👋 Logout berhasil');
            closeSidebar();
            addLog('logout', 'Admin logout');
        }

        // ============================================================
        // TAB SWITCHING
        // ============================================================
        function switchTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.tabs-bar .tab').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.sidebar .menu-item').forEach(el => el.classList.remove('active'));

            const tabMap = {
                'dashboard': 'tab-dashboard',
                'users': 'tab-users',
                'transactions': 'tab-transactions',
                'activity': 'tab-activity'
            };
            const content = document.getElementById(tabMap[tab]);
            if (content) content.style.display = 'block';

            document.querySelectorAll(`.tabs-bar .tab[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));
            document.querySelectorAll(`.sidebar .menu-item[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));

            const titles = { 'dashboard': 'Dashboard', 'users': 'User Management', 'transactions': 'All Transactions',
                'activity': 'Activity Log' };
            document.getElementById('page-title').innerHTML = titles[tab] + ' <span class="accent">Panel</span>';

            if (tab === 'transactions') renderTxPage();
            if (tab === 'activity') renderLogs();
            closeSidebar();
        }

        // ============================================================
        // AUTO REFRESH
        // ============================================================
        function toggleAutoRefresh() {
            const toggle = document.getElementById('auto-refresh-toggle');
            isAutoRefresh = toggle.classList.toggle('active');
            if (isAutoRefresh) { startAutoRefresh();
                document.getElementById('auto-refresh-status').textContent = 'Auto Refresh: Aktif';
                showToast('🔄 Auto Refresh diaktifkan'); } else { stopAutoRefresh();
                document.getElementById('auto-refresh-status').textContent = 'Auto Refresh: Nonaktif';
                showToast('⏸️ Auto Refresh dinonaktifkan'); }
        }

        function startAutoRefresh() { stopAutoRefresh(); if (!adminToken) return;
            autoRefreshInterval = setInterval(() => { if (document.getElementById('content-panel').style.display ===
                    'block') { loadUsersSilent();
                    loadAllTransactionsSilent(); } }, 30000); }

        function stopAutoRefresh() { if (autoRefreshInterval) { clearInterval(autoRefreshInterval);
                autoRefreshInterval = null; } }

        // ============================================================
        // LOAD USERS
        // ============================================================
        async function loadUsers() { if (!adminToken) { showToast('⚠️ Login terlebih dahulu'); return; } await fetchUsers(
            true); }

        async function loadUsersSilent() { await fetchUsers(false); }

        async function fetchUsers(showLoading = true) {
            const tbody = document.getElementById('user-table-body');
            if (showLoading) {
                tbody.innerHTML =
                    `<tr><td colspan="7" style="text-align:center;padding:28px 0;color:var(--text-3);"><span class="material-symbols-outlined" style="font-size:28px;display:block;margin-bottom:6px;">sync</span> Memuat data...</td></tr>`;
            }
            try {
                const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-admin-token': adminToken } });
                if (!res.ok) { if (res.status === 401) { showToast('❌ Token tidak valid, login ulang');
                        logoutAdmin(); return; } throw new Error('Gagal memuat'); }
                const data = await res.json();
                allUsers = data.users || [];
                applyFilters();
                updateStats(allUsers);
                document.getElementById('last-refresh').textContent = 'Terakhir: ' + new Date().toLocaleTimeString(
                'id-ID');
                if (showLoading) showToast('✅ Data diperbarui');
            } catch (e) {
                if (showLoading) {
                    tbody.innerHTML =
                        `<tr><td colspan="7" style="text-align:center;padding:28px 0;color:var(--expense);"><span class="material-symbols-outlined" style="font-size:28px;display:block;margin-bottom:6px;">error</span> Error: ${e.message}</td></tr>`;
                }
                showToast('❌ ' + e.message);
            }
        }

        // ============================================================
        // FILTERS & PAGINATION (Users)
        // ============================================================
        function applyFilters() {
            const search = document.getElementById('search-input').value.toLowerCase().trim();
            const sort = document.getElementById('sort-select').value;
            const statusFilter = document.getElementById('status-filter').value;
            filteredUsers = allUsers.filter(u => {
                const matchSearch = u.userId.includes(search);
                const matchStatus = statusFilter === 'all' ||
                    (statusFilter === 'active' && u.isActive !== false) ||
                    (statusFilter === 'inactive' && u.isActive === false);
                return matchSearch && matchStatus;
            });
            filteredUsers.sort((a, b) => {
                const aTx = a.transactionCount || 0,
                    bTx = b.transactionCount || 0;
                const aDate = new Date(a.registeredAt || 0),
                    bDate = new Date(b.registeredAt || 0);
                switch (sort) {
                    case 'newest':
                        return bDate - aDate;
                    case 'oldest':
                        return aDate - bDate;
                    case 'most-tx':
                        return bTx - aTx;
                    case 'least-tx':
                        return aTx - bTx;
                    default:
                        return 0;
                }
            });
            currentPage = 1;
            renderUserPage();
        }

        function renderUserPage() {
            const totalPages = Math.ceil(filteredUsers.length / pageSize);
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const pageUsers = filteredUsers.slice(start, end);
            renderUserRows(pageUsers);
            renderPagination(totalPages);
            document.getElementById('user-count-badge').textContent = filteredUsers.length;
            document.getElementById('sidebar-user-count').textContent = allUsers.length;
            document.getElementById('sidebar-user-count2').textContent = allUsers.length;
            document.getElementById('header-user-count').textContent = allUsers.length;
        }

        function goToPage(page) { const totalPages = Math.ceil(filteredUsers.length / pageSize); if (page < 1 || page >
                totalPages) return;
            currentPage = page;
            renderUserPage(); }

        function renderPagination(totalPages) {
            const container = document.getElementById('pagination-container');
            if (totalPages <= 1) { container.innerHTML = ''; return; }
            let html =
                `<button class="page-btn ${currentPage===1?'disabled':''}" onclick="goToPage(${currentPage-1})">‹</button>`;
            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
            if (startPage > 1) { html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
                if (startPage > 2) html += `<button class="page-btn disabled">…</button>`; }
            for (let i = startPage; i <= endPage; i++) { html +=
                    `<button class="page-btn ${i===currentPage?'active':''}" onclick="goToPage(${i})">${i}</button>`; }
            if (endPage < totalPages) { if (endPage < totalPages - 1) html += `<button class="page-btn disabled">…</button>`;
                html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`; }
            html +=
                `<button class="page-btn ${currentPage===totalPages?'disabled':''}" onclick="goToPage(${currentPage+1})">›</button>`;
            container.innerHTML = html;
        }

        function renderUserRows(users) {
            const tbody = document.getElementById('user-table-body');
            if (!users || users.length === 0) {
                tbody.innerHTML =
                    `<tr><td colspan="7" style="text-align:center;padding:32px 0;color:var(--text-3);"><span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:6px;">person_off</span> ${filteredUsers.length===0&&allUsers.length>0?'Tidak ada user yang cocok':'Belum ada user terdaftar'}</td></tr>`;
                return;
            }
            const startIdx = (currentPage - 1) * pageSize;
            tbody.innerHTML = users.map((u, i) => {
                const isActive = u.isActive !== false;
                const dateStr = u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }) : '-';
                const checked = selectedUsers.has(u.userId) ? 'checked' : '';
                return `<tr class="fade-in" style="animation-delay:${(i%10)*0.03}s;">
                            <td><input type="checkbox" class="checkbox-custom user-checkbox" data-userid="${u.userId}" ${checked} onchange="toggleUser('${u.userId}')" /></td>
                            <td style="color:var(--text-3);font-size:11px;">${startIdx+i+1}</td>
                            <td><span class="user-id-cell">${u.userId}</span></td>
                            <td style="text-align:center;font-weight:600;color:var(--text-1);">${u.transactionCount||0}</td>
                            <td style="text-align:center;"><span class="status-badge ${isActive?'active':'inactive'}">${isActive?'AKTIF':'NONAKTIF'}</span></td>
                            <td style="text-align:center;font-size:10px;color:var(--text-3);">${dateStr}</td>
                            <td style="text-align:center;">
                                <div style="display:flex;gap:3px;justify-content:center;flex-wrap:wrap;">
                                    <button class="btn btn-secondary btn-sm" onclick="viewUserDetail('${u.userId}')" data-tooltip="Detail"><span class="material-symbols-outlined" style="font-size:13px;">visibility</span></button>
                                    <button class="btn btn-secondary btn-sm" onclick="openEditUserModal('${u.userId}')" data-tooltip="Edit"><span class="material-symbols-outlined" style="font-size:13px;">edit</span></button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.userId}')" data-tooltip="Hapus"><span class="material-symbols-outlined" style="font-size:13px;">delete</span></button>
                                </div>
                            </td>
                        </tr>`;
            }).join('');
            updateBulkBar();
        }

        // ============================================================
        // BULK SELECTION
        // ============================================================
        function toggleUser(userId) {
            if (selectedUsers.has(userId)) selectedUsers.delete(userId);
            else selectedUsers.add(userId);
            updateBulkBar();
            document.querySelectorAll('.user-checkbox').forEach(cb => {
                if (cb.dataset.userid === userId) cb.checked = selectedUsers.has(userId);
            });
            document.getElementById('select-all').checked = selectedUsers.size === filteredUsers.length && filteredUsers
                .length > 0;
        }

        function toggleAllUsers() {
            const checked = document.getElementById('select-all').checked;
            if (checked) {
                filteredUsers.forEach(u => selectedUsers.add(u.userId));
            } else {
                selectedUsers.clear();
            }
            document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = checked);
            updateBulkBar();
        }

        function updateBulkBar() {
            const bar = document.getElementById('bulk-bar');
            const count = document.getElementById('bulk-count');
            if (selectedUsers.size > 0) {
                bar.classList.add('active');
                count.textContent = selectedUsers.size;
            } else {
                bar.classList.remove('active');
            }
        }

        function clearBulkSelection() { selectedUsers.clear();
            document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('select-all').checked = false;
            updateBulkBar(); }

        async function bulkDeleteUsers() {
            if (selectedUsers.size === 0) { showToast('⚠️ Pilih user terlebih dahulu'); return; }
            if (!confirm(`Hapus ${selectedUsers.size} user yang dipilih?`)) return;
            let deleted = 0;
            for (const userId of selectedUsers) {
                try {
                    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, { method: 'DELETE', headers: {
                            'x-admin-token': adminToken } });
                    if (res.ok) deleted++;
                } catch (e) {}
            }
            showToast(`✅ ${deleted} user berhasil dihapus`);
            selectedUsers.clear();
            clearBulkSelection();
            await fetchUsers(true);
            addLog('bulk_delete', `Menghapus ${deleted} user secara massal`);
        }

        async function bulkToggleStatus(active) {
            if (selectedUsers.size === 0) { showToast('⚠️ Pilih user terlebih dahulu'); return; }
            let updated = 0;
            for (const userId of selectedUsers) {
                try {
                    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                        method: 'PUT',
                        headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive: active })
                    });
                    if (res.ok) updated++;
                } catch (e) {}
            }
            showToast(`✅ ${updated} user di${active?'aktifkan':'nonaktifkan'}`);
            selectedUsers.clear();
            clearBulkSelection();
            await fetchUsers(true);
            addLog('bulk_status', `${updated} user di${active?'aktifkan':'nonaktifkan'} secara massal`);
        }

        // ============================================================
        // UPDATE STATS
        // ============================================================
        function updateStats(users) {
            if (!users) return;
            const total = users.length;
            const active = users.filter(u => u.isActive !== false).length;
            const totalTx = users.reduce((sum, u) => sum + (u.transactionCount || 0), 0);
            const avg = total > 0 ? Math.round(totalTx / total) : 0;
            document.getElementById('stat-users').textContent = total;
            document.getElementById('stat-active').textContent = active;
            document.getElementById('stat-transactions').textContent = totalTx.toLocaleString('id-ID');
            document.getElementById('stat-avg').textContent = avg.toLocaleString('id-ID');
            document.getElementById('header-user-count').textContent = total;
            document.getElementById('sidebar-user-count').textContent = total;
            document.getElementById('sidebar-user-count2').textContent = total;

            // Top/bottom user
            const sorted = [...users].sort((a, b) => (b.transactionCount || 0) - (a.transactionCount || 0));
            document.getElementById('top-user').textContent = sorted.length > 0 ? `${sorted[0].userId} (${sorted[0].transactionCount||0} tx)` :
                '—';
            document.getElementById('bottom-user').textContent = sorted.length > 0 ?
                `${sorted[sorted.length-1].userId} (${sorted[sorted.length-1].transactionCount||0} tx)` : '—';
        }

        // ============================================================
        // USER CRUD
        // ============================================================
        function openAddUserModal() {
            document.getElementById('user-modal-title').textContent = 'Tambah User';
            document.getElementById('user-form-id').value = '';
            document.getElementById('user-form-userid').value = '';
            document.getElementById('user-form-status').value = 'active';
            document.getElementById('user-modal').classList.add('active');
        }

        function openEditUserModal(userId) {
            const user = allUsers.find(u => u.userId === userId);
            if (!user) { showToast('⚠️ User tidak ditemukan'); return; }
            document.getElementById('user-modal-title').textContent = 'Edit User';
            document.getElementById('user-form-id').value = userId;
            document.getElementById('user-form-userid').value = userId;
            document.getElementById('user-form-userid').disabled = true;
            document.getElementById('user-form-status').value = user.isActive !== false ? 'active' : 'inactive';
            document.getElementById('user-modal').classList.add('active');
        }

        function closeUserModal() {
            document.getElementById('user-modal').classList.remove('active');
            document.getElementById('user-form-userid').disabled = false;
        }

        async function submitUserForm(e) {
            e.preventDefault();
            const userId = document.getElementById('user-form-id').value;
            const newUserId = document.getElementById('user-form-userid').value.trim();
            const status = document.getElementById('user-form-status').value;
            const isActive = status === 'active';

            if (!newUserId) { showToast('⚠️ User ID wajib diisi'); return; }

            try {
                if (userId) {
                    // Edit
                    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                        method: 'PUT',
                        headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive })
                    });
                    if (!res.ok) throw new Error('Gagal update user');
                    showToast(`✅ User ${userId} berhasil diupdate`);
                    addLog('edit_user', `Mengedit user ${userId}`);
                } else {
                    // Add new user
                    const res = await fetch(`${API_BASE}/api/admin/users`, {
                        method: 'POST',
                        headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: newUserId, isActive })
                    });
                    if (!res.ok) throw new Error('Gagal tambah user');
                    showToast(`✅ User ${newUserId} berhasil ditambahkan`);
                    addLog('add_user', `Menambahkan user ${newUserId}`);
                }
                closeUserModal();
                await fetchUsers(true);
                loadAllTransactionsSilent();
            } catch (e) { showToast('❌ ' + e.message); }
        }

        async function deleteUser(userId) {
            if (!confirm(`⚠️ Hapus semua data user ${userId}?`)) return;
            try {
                const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, { method: 'DELETE', headers: {
                        'x-admin-token': adminToken } });
                if (!res.ok) { if (res.status === 401) { showToast('❌ Token tidak valid');
                        logoutAdmin(); return; } throw new Error('Gagal hapus'); }
                showToast(`✅ Data user ${userId} berhasil dihapus`);
                addLog('delete_user', `Menghapus user ${userId}`);
                await fetchUsers(true);
                loadAllTransactionsSilent();
            } catch (e) { showToast(`❌ ${e.message}`); }
        }

        async function clearAllUsers() {
            if (!confirm('⚠️ Hapus SEMUA data user?')) return;
            if (!confirm('✅ Konfirmasi kedua: Hapus semua data pengguna?')) return;
            try {
                const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-admin-token': adminToken } });
                if (!res.ok) throw new Error('Gagal mengambil daftar user');
                const data = await res.json();
                let deleted = 0;
                for (const user of data.users) {
                    const delRes = await fetch(`${API_BASE}/api/admin/users/${user.userId}`, { method: 'DELETE',
                        headers: { 'x-admin-token': adminToken } });
                    if (delRes.ok) deleted++;
                }
                showToast(`✅ ${deleted} user berhasil dihapus`);
                addLog('clear_all', `Menghapus semua ${deleted} user`);
                await fetchUsers(true);
                loadAllTransactionsSilent();
            } catch (e) { showToast(`❌ ${e.message}`); }
        }

        // ============================================================
        // USER DETAIL (Modal) — dengan tombol Export PDF
        // ============================================================
        async function viewUserDetail(userId) {
            const modal = document.getElementById('detail-modal');
            document.getElementById('modal-user-title').textContent = `Detail User: ${userId}`;
            const body = document.getElementById('modal-body-content');
            body.innerHTML =
                `<div style="text-align:center;padding:24px 0;color:var(--text-3);"><span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">sync</span> Memuat transaksi...</div>`;
            modal.classList.add('active');
            try {
                const res = await fetch(`${API_BASE}/api/transactions/${userId}`, { headers: { 'x-admin-token': adminToken } });
                if (!res.ok) throw new Error('Gagal memuat transaksi');
                const txs = await res.json();
                const sorted = txs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
                const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
                const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
                
                // ---- TAMBAHAN: tombol Export PDF ----
                let html =
                    `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
                        <button class="btn btn-primary btn-sm" onclick="exportPDF('${userId}')">
                            <span class="material-symbols-outlined">picture_as_pdf</span> Export PDF
                        </button>
                    </div>
                    <div class="summary-grid"><div class="sum-item"><div class="sum-label">Total Transaksi</div><div class="sum-value accent">${sorted.length}</div></div><div class="sum-item"><div class="sum-label">Pemasukan</div><div class="sum-value income">Rp ${totalIncome.toLocaleString('id-ID')}</div></div><div class="sum-item"><div class="sum-label">Pengeluaran</div><div class="sum-value expense">Rp ${totalExpense.toLocaleString('id-ID')}</div></div></div>`;
                // ------------------------------------

                if (sorted.length === 0) {
                    html +=
                        `<div class="tx-empty"><span class="material-symbols-outlined">inbox</span> Belum ada transaksi.</div>`;
                } else {
                    html += `<div style="max-height:300px;overflow-y:auto;padding-right:4px;">`;
                    sorted.slice(0, 50).forEach(t => {
                        const isIncome = t.type === 'income';
                        const amtClass = isIncome ? 'income' : 'expense';
                        const sign = isIncome ? '+' : '−';
                        html +=
                            `<div class="tx-item"><span style="font-weight:500;color:var(--text-1);font-size:11px;">${t.date||'-'}</span><span style="flex:1;margin:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-2);font-size:12px;">${t.note||t.category||'-'}</span><span class="tx-amount ${amtClass}">${sign}Rp ${Number(t.amount).toLocaleString('id-ID')}</span>
                                    <div class="tx-actions"><button class="btn btn-secondary btn-sm" onclick="editTxFromDetail('${t.id}','${userId}')" style="padding:2px 6px;"><span class="material-symbols-outlined" style="font-size:12px;">edit</span></button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteTx('${t.id}')" style="padding:2px 6px;"><span class="material-symbols-outlined" style="font-size:12px;">delete</span></button></div></div>`;
                    });
                    if (sorted.length > 50) html +=
                        `<div style="text-align:center;padding:8px;color:var(--text-3);font-size:11px;border-top:1px solid var(--border);">... dan ${sorted.length-50} transaksi lainnya</div>`;
                    html += `</div>`;
                }
                body.innerHTML = html;
            } catch (e) {
                body.innerHTML =
                    `<div style="text-align:center;padding:24px 0;color:var(--expense);"><span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">error</span> Gagal: ${e.message}</div>`;
            }
        }

        // ============================================================
        // EXPORT PDF — fungsi baru
        // ============================================================
        function exportPDF(userId) {
            if (!adminToken) { showToast('⚠️ Login terlebih dahulu'); return; }
            // Buka PDF di tab baru dengan header token (query param tidak aman, tapi untuk demo cukup)
            window.open(`${API_BASE}/api/export-pdf/${userId}?x-admin-token=${adminToken}`, '_blank');
        }

        function closeDetailModal() { document.getElementById('detail-modal').classList.remove('active'); }

        // ============================================================
        // TRANSACTIONS CRUD
        // ============================================================
        let allTxData = [];

        async function loadAllTransactions() { if (!adminToken) return; await fetchAllTransactions(true); }

        async function loadAllTransactionsSilent() { await fetchAllTransactions(false); }

        async function fetchAllTransactions(showLoading = true) {
            const tbody = document.getElementById('tx-table-body');
            if (showLoading) {
                tbody.innerHTML =
                    `<tr><td colspan="7" style="text-align:center;padding:28px 0;color:var(--text-3);"><span class="material-symbols-outlined" style="font-size:28px;display:block;margin-bottom:6px;">sync</span> Memuat transaksi...</td></tr>`;
            }
            try {
                const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-admin-token': adminToken } });
                if (!res.ok) throw new Error('Gagal memuat user');
                const data = await res.json();
                const users = data.users || [];
                let allTx = [];
                for (const user of users) {
                    try {
                        const txRes = await fetch(`${API_BASE}/api/transactions/${user.userId}`, { headers: {
                                'x-admin-token': adminToken } });
                        if (txRes.ok) {
                            const txs = await txRes.json();
                            txs.forEach(t => { t.userId = user.userId; });
                            allTx = allTx.concat(txs);
                        }
                    } catch (e) {}
                }
                allTxData = allTx;
                applyTxFilters();
                document.getElementById('tx-count-badge').textContent = allTxData.length;
                if (showLoading) showToast('✅ Transaksi dimuat');
            } catch (e) {
                if (showLoading) {
                    tbody.innerHTML =
                        `<tr><td colspan="7" style="text-align:center;padding:28px 0;color:var(--expense);"><span class="material-symbols-outlined" style="font-size:28px;display:block;margin-bottom:6px;">error</span> Error: ${e.message}</td></tr>`;
                }
                showToast('❌ ' + e.message);
            }
        }

        function applyTxFilters() {
            const search = document.getElementById('tx-search-input').value.toLowerCase().trim();
            const type = document.getElementById('tx-type-filter').value;
            const from = document.getElementById('tx-date-from').value;
            const to = document.getElementById('tx-date-to').value;

            filteredTx = allTxData.filter(t => {
                const matchSearch = t.userId.includes(search) || (t.note || '').toLowerCase().includes(search);
                const matchType = type === 'all' || t.type === type;
                let matchDate = true;
                if (from) { const d = t.date || ''; if (d < from) matchDate = false; }
                if (to) { const d = t.date || ''; if (d > to) matchDate = false; }
                return matchSearch && matchType && matchDate;
            });
            filteredTx.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
            txPage = 1;
            renderTxPage();
            document.getElementById('tx-count-badge').textContent = filteredTx.length;
        }

        function renderTxPage() {
            const tbody = document.getElementById('tx-table-body');
            const totalPages = Math.ceil(filteredTx.length / txPageSize);
            const start = (txPage - 1) * txPageSize;
            const end = start + txPageSize;
            const pageTx = filteredTx.slice(start, end);

            if (!pageTx || pageTx.length === 0) {
                tbody.innerHTML =
                    `<tr><td colspan="7" style="text-align:center;padding:32px 0;color:var(--text-3);"><span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:6px;">receipt</span> ${allTxData.length===0?'Belum ada transaksi':'Tidak ada transaksi yang cocok'}</td></tr>`;
            } else {
                tbody.innerHTML = pageTx.map((t, i) => {
                    const isIncome = t.type === 'income';
                    const amtClass = isIncome ? 'income' : 'expense';
                    const sign = isIncome ? '+' : '−';
                    return `<tr class="fade-in" style="animation-delay:${(i%10)*0.03}s;">
                                <td style="color:var(--text-3);font-size:11px;">${start+i+1}</td>
                                <td><span class="user-id-cell">${t.userId}</span></td>
                                <td style="font-size:11px;color:var(--text-2);">${t.date||'-'}</td>
                                <td style="font-size:11px;color:var(--text-2);">${t.category||'-'}</td>
                                <td style="font-size:12px;color:var(--text-2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.note||'-'}</td>
                                <td style="text-align:right;font-weight:600;${isIncome?'color:var(--income)':'color:var(--expense)'};">${sign}Rp ${Number(t.amount).toLocaleString('id-ID')}</td>
                                <td style="text-align:center;">
                                    <div style="display:flex;gap:3px;justify-content:center;">
                                        <button class="btn btn-secondary btn-sm" onclick="editTx('${t.id}','${t.userId}')" style="padding:2px 6px;"><span class="material-symbols-outlined" style="font-size:12px;">edit</span></button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteTx('${t.id}')" style="padding:2px 6px;"><span class="material-symbols-outlined" style="font-size:12px;">delete</span></button>
                                    </div>
                                </td>
                            </tr>`;
                }).join('');
            }

            const container = document.getElementById('tx-pagination-container');
            if (totalPages <= 1) { container.innerHTML = ''; return; }
            let html =
                `<button class="page-btn ${txPage===1?'disabled':''}" onclick="goToTxPage(${txPage-1})">‹</button>`;
            const maxVisible = 5;
            let startPage = Math.max(1, txPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
            if (startPage > 1) { html += `<button class="page-btn" onclick="goToTxPage(1)">1</button>`;
                if (startPage > 2) html += `<button class="page-btn disabled">…</button>`; }
            for (let i = startPage; i <= endPage; i++) { html +=
                    `<button class="page-btn ${i===txPage?'active':''}" onclick="goToTxPage(${i})">${i}</button>`; }
            if (endPage < totalPages) { if (endPage < totalPages - 1) html += `<button class="page-btn disabled">…</button>`;
                html += `<button class="page-btn" onclick="goToTxPage(${totalPages})">${totalPages}</button>`; }
            html +=
                `<button class="page-btn ${txPage===totalPages?'disabled':''}" onclick="goToTxPage(${txPage+1})">›</button>`;
            container.innerHTML = html;
        }

        function goToTxPage(page) { const totalPages = Math.ceil(filteredTx.length / txPageSize); if (page < 1 || page >
                totalPages) return;
            txPage = page;
            renderTxPage(); }

        function openAddTxModal() {
            document.getElementById('tx-modal-title').textContent = 'Tambah Transaksi';
            document.getElementById('tx-form-id').value = '';
            document.getElementById('tx-form-userid').value = '';
            document.getElementById('tx-form-type').value = 'income';
            document.getElementById('tx-form-amount').value = '';
            document.getElementById('tx-form-category').value = 'Makanan';
            document.getElementById('tx-form-date').value = new Date().toISOString().slice(0, 10);
            document.getElementById('tx-form-note').value = '';
            const datalist = document.getElementById('user-list-datalist');
            datalist.innerHTML = allUsers.map(u => `<option value="${u.userId}">`).join('');
            document.getElementById('tx-modal').classList.add('active');
        }

        function editTx(txId, userId) {
            const tx = allTxData.find(t => t.id === txId);
            if (!tx) { showToast('⚠️ Transaksi tidak ditemukan'); return; }
            document.getElementById('tx-modal-title').textContent = 'Edit Transaksi';
            document.getElementById('tx-form-id').value = txId;
            document.getElementById('tx-form-userid').value = userId;
            document.getElementById('tx-form-type').value = tx.type || 'income';
            document.getElementById('tx-form-amount').value = tx.amount || 0;
            document.getElementById('tx-form-category').value = tx.category || 'Makanan';
            document.getElementById('tx-form-date').value = tx.date || new Date().toISOString().slice(0, 10);
            document.getElementById('tx-form-note').value = tx.note || '';
            const datalist = document.getElementById('user-list-datalist');
            datalist.innerHTML = allUsers.map(u => `<option value="${u.userId}">`).join('');
            document.getElementById('tx-modal').classList.add('active');
        }

        function editTxFromDetail(txId, userId) { editTx(txId, userId);
            closeDetailModal(); }

        function closeTxModal() { document.getElementById('tx-modal').classList.remove('active'); }

        async function submitTxForm(e) {
            e.preventDefault();
            const id = document.getElementById('tx-form-id').value;
            const userId = document.getElementById('tx-form-userid').value.trim();
            const type = document.getElementById('tx-form-type').value;
            const amount = parseFloat(document.getElementById('tx-form-amount').value);
            const category = document.getElementById('tx-form-category').value;
            const date = document.getElementById('tx-form-date').value;
            const note = document.getElementById('tx-form-note').value.trim();

            if (!userId) { showToast('⚠️ User ID wajib diisi'); return; }
            if (!amount || amount <= 0) { showToast('⚠️ Jumlah harus lebih dari 0'); return; }
            if (!date) { showToast('⚠️ Tanggal wajib diisi'); return; }

            if (!allUsers.find(u => u.userId === userId)) {
                showToast('⚠️ User ID tidak ditemukan, tambahkan user terlebih dahulu');
                return;
            }

            try {
                if (id) {
                    const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
                        method: 'PUT',
                        headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, type, amount, category, date, note })
                    });
                    if (!res.ok) throw new Error('Gagal update transaksi');
                    showToast('✅ Transaksi berhasil diupdate');
                    addLog('edit_tx', `Mengedit transaksi ${id} untuk user ${userId}`);
                } else {
                    const res = await fetch(`${API_BASE}/api/transactions`, {
                        method: 'POST',
                        headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, type, amount, category, date, note })
                    });
                    if (!res.ok) throw new Error('Gagal tambah transaksi');
                    showToast('✅ Transaksi berhasil ditambahkan');
                    addLog('add_tx', `Menambahkan transaksi untuk user ${userId} (${type})`);
                }
                closeTxModal();
                await fetchUsers(true);
                await loadAllTransactionsSilent();
            } catch (e) { showToast('❌ ' + e.message); }
        }

        async function deleteTx(txId) {
            if (!confirm('⚠️ Hapus transaksi ini?')) return;
            try {
                const res = await fetch(`${API_BASE}/api/transactions/${txId}`, { method: 'DELETE', headers: {
                        'x-admin-token': adminToken } });
                if (!res.ok) throw new Error('Gagal hapus transaksi');
                showToast('✅ Transaksi berhasil dihapus');
                addLog('delete_tx', `Menghapus transaksi ${txId}`);
                await loadAllTransactionsSilent();
                await fetchUsers(true);
                closeDetailModal();
            } catch (e) { showToast('❌ ' + e.message); }
        }

        // ============================================================
        // EXPORT
        // ============================================================
        function exportCSV() {
            if (!allUsers || allUsers.length === 0) { showToast('⚠️ Tidak ada data user'); return; }
            let csv = 'User ID,Registered At,Is Active,Transaction Count\n';
            allUsers.forEach(u => {
                const date = u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('id-ID') : '';
                csv += `${u.userId},${date},${u.isActive!==false?'Yes':'No'},${u.transactionCount||0}\n`;
            });
            downloadCSV(csv, `users_${new Date().toISOString().slice(0,10)}.csv`);
            showToast('✅ CSV user berhasil di-export');
            addLog('export', 'Export data user ke CSV');
        }

        function exportTxCSV() {
            if (!allTxData || allTxData.length === 0) { showToast('⚠️ Tidak ada data transaksi'); return; }
            let csv = 'User ID,Date,Type,Category,Amount,Note\n';
            allTxData.forEach(t => {
                csv +=
                    `${t.userId},${t.date||''},${t.type||''},${t.category||''},${t.amount||0},"${(t.note||'').replace(/"/g,'""')}"\n`;
            });
            downloadCSV(csv, `transactions_${new Date().toISOString().slice(0,10)}.csv`);
            showToast('✅ CSV transaksi berhasil di-export');
            addLog('export', 'Export data transaksi ke CSV');
        }

        function downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        }

        // ============================================================
        // IMPORT CSV
        // ============================================================
        function openImportModal() { document.getElementById('import-modal').classList.add('active');
            document.getElementById('import-status').textContent = ''; }

        function closeImportModal() { document.getElementById('import-modal').classList.remove('active'); }

        async function importCSV() {
            const fileInput = document.getElementById('import-file');
            const status = document.getElementById('import-status');
            if (!fileInput.files || fileInput.files.length === 0) { status.textContent = '⚠️ Pilih file CSV terlebih dahulu';
                return; }
            const file = fileInput.files[0];
            try {
                const text = await file.text();
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) { status.textContent = '⚠️ File kosong atau format tidak valid'; return; }
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const idxUserId = headers.findIndex(h => h.includes('user') || h.includes('userid'));
                const idxType = headers.findIndex(h => h.includes('type'));
                const idxAmount = headers.findIndex(h => h.includes('amount') || h.includes('nominal'));
                const idxCategory = headers.findIndex(h => h.includes('category') || h.includes('kategori'));
                const idxNote = headers.findIndex(h => h.includes('note') || h.includes('catatan') || h.includes('keterangan'));
                const idxDate = headers.findIndex(h => h.includes('date') || h.includes('tanggal'));

                if (idxUserId === -1 || idxAmount === -1) { status.textContent =
                        '⚠️ Format CSV harus memiliki kolom: userId, amount (dan type opsional)'; return; }

                let added = 0;
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',').map(c => c.trim());
                    const userId = cols[idxUserId] || '';
                    const type = idxType !== -1 ? (cols[idxType] || 'income') : 'income';
                    const amount = parseFloat(cols[idxAmount]) || 0;
                    const category = idxCategory !== -1 ? (cols[idxCategory] || 'Lainnya') : 'Lainnya';
                    const note = idxNote !== -1 ? (cols[idxNote] || '') : '';
                    const date = idxDate !== -1 ? (cols[idxDate] || new Date().toISOString().slice(0, 10)) : new Date()
                        .toISOString().slice(0, 10);

                    if (!userId || amount <= 0) continue;
                    let userExists = allUsers.find(u => u.userId === userId);
                    if (!userExists) {
                        await fetch(`${API_BASE}/api/admin/users`, {
                            method: 'POST',
                            headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, isActive: true })
                        });
                        userExists = { userId };
                        added++;
                    }
                    await fetch(`${API_BASE}/api/transactions`, {
                        method: 'POST',
                        headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, type, amount, category, date, note })
                    });
                }
                status.textContent = `✅ Berhasil import ${added} user dan transaksi`;
                showToast(`✅ Import selesai: ${added} user`);
                addLog('import', `Import data dari CSV (${added} user)`);
                await fetchUsers(true);
                await loadAllTransactionsSilent();
                closeImportModal();
            } catch (e) { status.textContent = '❌ ' + e.message;
                showToast('❌ ' + e.message); }
        }

        // ============================================================
        // ACTIVITY LOG
        // ============================================================
        function addLog(action, detail) {
            const log = { id: Date.now(), time: new Date().toISOString(), action, detail };
            let logs = JSON.parse(localStorage.getItem('admin_activity_log') || '[]');
            logs.unshift(log);
            if (logs.length > 200) logs = logs.slice(0, 200);
            localStorage.setItem('admin_activity_log', JSON.stringify(logs));
            activityLogs = logs;
            renderLogs();
        }

        function loadActivityLog() {
            activityLogs = JSON.parse(localStorage.getItem('admin_activity_log') || '[]');
            renderLogs();
        }

        function renderLogs() {
            const container = document.getElementById('log-list');
            document.getElementById('log-count-badge').textContent = activityLogs.length;
            if (activityLogs.length === 0) {
                container.innerHTML =
                    `<div style="text-align:center;padding:24px 0;color:var(--text-3);font-size:12px;">Belum ada log aktivitas</div>`;
                return;
            }
            const icons = {
                'add_user': 'person_add',
                'edit_user': 'edit',
                'delete_user': 'delete',
                'bulk_delete': 'delete_sweep',
                'bulk_status': 'check_circle',
                'add_tx': 'receipt_long',
                'edit_tx': 'edit_note',
                'delete_tx': 'delete',
                'export': 'download',
                'import': 'upload_file',
                'clear_all': 'delete_sweep',
                'login': 'login',
                'logout': 'logout'
            };
            const badges = {
                'add_user': 'success',
                'edit_user': 'info',
                'delete_user': 'danger',
                'bulk_delete': 'danger',
                'bulk_status': 'warning',
                'add_tx': 'success',
                'edit_tx': 'info',
                'delete_tx': 'danger',
                'export': 'info',
                'import': 'success',
                'clear_all': 'danger',
                'login': 'success',
                'logout': 'warning'
            };
            container.innerHTML = activityLogs.slice(0, 100).map(log => {
                const icon = icons[log.action] || 'info';
                const badge = badges[log.action] || 'info';
                const time = new Date(log.time).toLocaleString('id-ID');
                return `<div class="log-item">
                            <span class="log-time">${time}</span>
                            <span class="log-icon material-symbols-outlined">${icon}</span>
                            <span class="log-text"><strong>${log.action.replace('_',' ').toUpperCase()}</strong> — ${log.detail}</span>
                            <span class="log-badge ${badge}">${badge}</span>
                        </div>`;
            }).join('');
        }

        function clearLogs() {
            if (!confirm('Hapus semua log aktivitas?')) return;
            localStorage.removeItem('admin_activity_log');
            activityLogs = [];
            renderLogs();
            showToast('✅ Log berhasil dihapus');
        }

        function exportLogsCSV() {
            if (activityLogs.length === 0) { showToast('⚠️ Tidak ada log'); return; }
            let csv = 'Time,Action,Detail\n';
            activityLogs.forEach(l => {
                csv += `${l.time},${l.action},"${l.detail.replace(/"/g,'""')}"\n`;
            });
            downloadCSV(csv, `activity_log_${new Date().toISOString().slice(0,10)}.csv`);
            showToast('✅ Log berhasil di-export');
        }

        // ============================================================
        // CLOSE MODALS ON OVERLAY CLICK
        // ============================================================
        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.addEventListener('click', function(e) { if (e.target === this) { this.classList.remove('active'); } });
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
                closeSidebar();
            }
        });

        // ============================================================
        // CHECK SESSION
        // ============================================================
        (function checkSession() {
            const savedToken = sessionStorage.getItem('admin_token');
            if (savedToken) {
                adminToken = savedToken;
                fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-admin-token': adminToken } })
                    .then(res => { if (!res.ok) throw new Error('Token tidak valid'); return res.json(); })
                    .then(data => {
                        document.getElementById('login-overlay').classList.add('hidden');
                        document.getElementById('tabs-bar').style.display = 'flex';
                        document.getElementById('content-panel').style.display = 'block';
                        document.getElementById('header-actions').style.display = 'flex';
                        setStatus('✅ Sesi aktif', 'success');
                        allUsers = data.users || [];
                        applyFilters();
                        updateStats(allUsers);
                        loadAllTransactionsSilent();
                        loadActivityLog();
                        showToast('👋 Selamat datang kembali, Admin!');
                        document.getElementById('last-refresh').textContent = 'Terakhir: ' + new Date()
                            .toLocaleTimeString('id-ID');
                        document.getElementById('auto-refresh-status').textContent = 'Auto Refresh: Aktif';
                        if (isAutoRefresh) startAutoRefresh();
                        switchTab('dashboard');
                        addLog('login', 'Admin login (auto)');
                    })
                    .catch(() => { sessionStorage.removeItem('admin_token');
                        adminToken = '';
                        setStatus('🔓 Login untuk mengakses', ''); });
            } else { setStatus('🔓 Login untuk mengakses', ''); }
        })();
    </script>

</body>
</html>
