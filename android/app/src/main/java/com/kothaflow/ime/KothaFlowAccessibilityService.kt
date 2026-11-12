package com.kothaflow.ime

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo

class KothaFlowAccessibilityService : AccessibilityService() {

    companion object {
        var instance: KothaFlowAccessibilityService? = null
            private set

        fun isRunning(): Boolean = instance != null
    }

    private var lastFocusedNode: AccessibilityNodeInfo? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Continuously track the active editable text box across Messenger, WhatsApp, etc.
        val eventType = event.eventType
        if (eventType == AccessibilityEvent.TYPE_VIEW_FOCUSED ||
            eventType == AccessibilityEvent.TYPE_VIEW_CLICKED ||
            eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED ||
            eventType == AccessibilityEvent.TYPE_VIEW_TEXT_SELECTION_CHANGED) {

            val source = event.source
            if (source != null && source.isEditable) {
                lastFocusedNode = source
            }
        }
    }

    override fun onInterrupt() {
        // Service interrupted
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
        lastFocusedNode = null
    }

    /**
     * Types or pastes text DIRECTLY into the active cursor in whatever app is open
     * (Messenger, WhatsApp, Chrome, Facebook, Notes, etc.) without requiring manual paste.
     */
    fun insertTextIntoFocusedInput(textToInsert: String): Boolean {
        if (textToInsert.isBlank()) return false

        try {
            // Put text into clipboard first to ensure instant pasting support
            copyToClipboard(textToInsert)

            // Step 1: Find the target editable node in the active application window
            var targetNode: AccessibilityNodeInfo? = null

            // Search through active application windows (behind our floating overlay)
            val currentWindows = windows
            if (!currentWindows.isNullOrEmpty()) {
                for (window in currentWindows) {
                    if (window.type == AccessibilityWindowInfo.TYPE_APPLICATION) {
                        val root = window.root ?: continue
                        val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                        if (focused != null && focused.isEditable) {
                            targetNode = focused
                            break
                        }
                        val editable = findEditableNode(root)
                        if (editable != null) {
                            targetNode = editable
                            break
                        }
                    }
                }
            }

            // Step 2: If not found in windows, check cached lastFocusedNode
            if (targetNode == null && lastFocusedNode != null) {
                targetNode = lastFocusedNode
            }

            // Step 3: If still not found, check rootInActiveWindow
            if (targetNode == null) {
                val root = rootInActiveWindow
                if (root != null) {
                    targetNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: findEditableNode(root)
                }
            }

            // Step 4: Perform direct typing/pasting into the target box
            if (targetNode != null) {
                // Ensure focus on target node
                targetNode.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

                // Strategy A: Native ACTION_PASTE (Triggers Messenger/WhatsApp input listeners & send button)
                val pasteSuccess = targetNode.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                if (pasteSuccess) {
                    return true
                }

                // Strategy B: Direct ACTION_SET_TEXT (Appends to existing text)
                val existing = targetNode.text?.toString() ?: ""
                val combined = if (existing.isEmpty()) textToInsert else "$existing $textToInsert"
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, combined)
                }
                val setSuccess = targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                if (setSuccess) {
                    return true
                }
            }
        } catch (_: Exception) {}

        // Fallback: Clipboard is already updated
        return false
    }

    private fun findEditableNode(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isEditable) return node
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val result = findEditableNode(child)
            if (result != null) return result
        }
        return null
    }

    private fun copyToClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("KothaFlow Text", text)
        clipboard.setPrimaryClip(clip)
    }
}
