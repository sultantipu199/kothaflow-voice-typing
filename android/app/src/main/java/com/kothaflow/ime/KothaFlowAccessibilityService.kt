package com.kothaflow.ime

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo

class KothaFlowAccessibilityService : AccessibilityService() {

    companion object {
        var instance: KothaFlowAccessibilityService? = null
            private set

        fun isRunning(): Boolean = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.d("KothaFlowAccess", "Accessibility service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Real-time events monitored
    }

    override fun onInterrupt() {
        Log.d("KothaFlowAccess", "Accessibility service interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    /**
     * Finds the active editable text node freshly across all active and interactive windows.
     */
    private fun findActiveInputNode(): AccessibilityNodeInfo? {
        // Priority 1: Check rootInActiveWindow
        try {
            val root = rootInActiveWindow
            if (root != null) {
                val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                if (focused != null && focused.isEditable) {
                    return focused
                }
                val focusedEditable = findFirstMatching(root) { it.isFocused && it.isEditable }
                if (focusedEditable != null) return focusedEditable

                val anyEditable = findFirstMatching(root) { it.isEditable }
                if (anyEditable != null) return anyEditable
            }
        } catch (e: Exception) {
            Log.w("KothaFlowAccess", "rootInActiveWindow scan error: ${e.message}")
        }

        // Priority 2: Check all interactive windows (checking focused / application windows first)
        try {
            val currentWindows = windows
            if (!currentWindows.isNullOrEmpty()) {
                val sorted = currentWindows.sortedByDescending {
                    (if (it.isFocused) 10 else 0) + (if (it.type == AccessibilityWindowInfo.TYPE_APPLICATION) 5 else 0)
                }

                for (win in sorted) {
                    val root = win.root ?: continue
                    val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                    if (focused != null && focused.isEditable) {
                        return focused
                    }
                    val focusedEditable = findFirstMatching(root) { it.isFocused && it.isEditable }
                    if (focusedEditable != null) return focusedEditable

                    val anyEditable = findFirstMatching(root) { it.isEditable }
                    if (anyEditable != null) return anyEditable
                }
            }
        } catch (e: Exception) {
            Log.w("KothaFlowAccess", "windows scan error: ${e.message}")
        }

        return null
    }

    private fun findFirstMatching(root: AccessibilityNodeInfo?, predicate: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo? {
        if (root == null) return null
        if (predicate(root)) return root

        val count = root.childCount
        for (i in 0 until count) {
            val child = root.getChild(i) ?: continue
            val match = findFirstMatching(child, predicate)
            if (match != null) return match
        }
        return null
    }

    /**
     * Types or pastes text DIRECTLY into the active write box in whatever app is open
     * (Messenger, WhatsApp, Chrome, Facebook, Notes, Telegram, etc.) without requiring manual paste.
     */
    fun insertTextIntoFocusedInput(textToInsert: String): Boolean {
        if (textToInsert.isBlank()) return false

        try {
            // Keep clipboard populated as a seamless baseline
            copyToClipboard(textToInsert)

            val targetNode = findActiveInputNode()
            if (targetNode != null) {
                // Request focus on target
                targetNode.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

                // Strategy A: Direct ACTION_SET_TEXT (Instantly puts text into the write box)
                val currentText = targetNode.text?.toString() ?: ""
                val combinedText = if (currentText.isEmpty()) {
                    textToInsert
                } else if (currentText.endsWith(" ")) {
                    "$currentText$textToInsert"
                } else {
                    "$currentText $textToInsert"
                }

                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, combinedText)
                }
                val setSuccess = targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)

                if (setSuccess) {
                    // Position cursor at the very end
                    val selArgs = Bundle().apply {
                        putInt(AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_START_INT, combinedText.length)
                        putInt(AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_END_INT, combinedText.length)
                    }
                    targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_SELECTION, selArgs)
                    Log.d("KothaFlowAccess", "Successfully direct-typed via ACTION_SET_TEXT")
                    return true
                }

                // Strategy B: Native ACTION_PASTE (For custom text controls that reject ACTION_SET_TEXT)
                val pasteSuccess = targetNode.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                if (pasteSuccess) {
                    Log.d("KothaFlowAccess", "Successfully direct-typed via ACTION_PASTE")
                    return true
                }
            }
        } catch (e: Exception) {
            Log.e("KothaFlowAccess", "insertTextIntoFocusedInput exception: ${e.message}")
        }

        return false
    }

    private fun copyToClipboard(text: String) {
        try {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("KothaFlow Text", text)
            clipboard.setPrimaryClip(clip)
        } catch (_: Exception) {}
    }
}
