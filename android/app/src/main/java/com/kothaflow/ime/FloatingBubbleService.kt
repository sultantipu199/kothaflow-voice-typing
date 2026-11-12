package com.kothaflow.ime

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.RelativeLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class FloatingBubbleService : Service() {

    companion object {
        var isRunning = false
            private set
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        private const val CHANNEL_ID = "kothaflow_bubble_channel"
        private const val NOTIFICATION_ID = 2001
    }

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var params: WindowManager.LayoutParams? = null

    private var bubbleIdleView: RelativeLayout? = null
    private var bubblePillView: LinearLayout? = null
    private var tvBubbleLangBadge: TextView? = null
    private var tvPillText: TextView? = null
    private var btnPillDone: ImageButton? = null
    private var btnPillClose: ImageButton? = null

    private var speechRecognizer: SpeechRecognizer? = null
    private var isRecording = false
    private var currentLangCode = "bn-BD"
    private var currentLangShort = "বা"
    private var recordedText = ""

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())

        setupFloatingView()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "KothaFlow Floating Bubble",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "KothaFlow ভাসমান ভয়েস বাবল সার্ভিস"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val stopIntent = Intent(this, FloatingBubbleService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val appIntent = Intent(this, MainActivity::class.java)
        val appPending = PendingIntent.getActivity(
            this, 0, appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("KothaFlow বাবল চালু আছে")
            .setContentText("যেকোনো অ্যাপে কথা বলে টাইপ করতে পর্দায় থাকা বাবলে ট্যাপ করুন")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(appPending)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "বাবল বন্ধ করুন", stopPending)
            .setOngoing(true)
            .build()
    }

    private fun setupFloatingView() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 20
            y = 350
        }

        val inflater = LayoutInflater.from(this)
        floatingView = inflater.inflate(R.layout.layout_floating_bubble, null)

        bubbleIdleView = floatingView?.findViewById(R.id.bubbleIdleView)
        bubblePillView = floatingView?.findViewById(R.id.bubblePillView)
        tvBubbleLangBadge = floatingView?.findViewById(R.id.tvBubbleLangBadge)
        tvPillText = floatingView?.findViewById(R.id.tvPillText)
        btnPillDone = floatingView?.findViewById(R.id.btnPillDone)
        btnPillClose = floatingView?.findViewById(R.id.btnPillClose)

        tvBubbleLangBadge?.text = currentLangShort

        // Switch language on long click of idle bubble
        bubbleIdleView?.setOnLongClickListener {
            toggleLanguage()
            true
        }

        // Tap on bubble starts recording
        bubbleIdleView?.setOnClickListener {
            vibrateDevice()
            startListening()
        }

        // Done button in recording pill
        btnPillDone?.setOnClickListener {
            stopListeningAndCommit()
        }

        // Cancel button in recording pill
        btnPillClose?.setOnClickListener {
            cancelListening()
        }

        // Draggable touch handling
        setupTouchListener()

        windowManager?.addView(floatingView, params)
    }

    private fun setupTouchListener() {
        val root = floatingView?.findViewById<FrameLayout>(R.id.floatingRoot) ?: return

        root.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var isDragging = false

            override fun onTouch(v: View?, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params?.x ?: 0
                        initialY = params?.y ?: 0
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isDragging = false
                        return false // Allow click listener to trigger if not dragged
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = (event.rawX - initialTouchX).toInt()
                        val dy = (event.rawY - initialTouchY).toInt()

                        if (abs(dx) > 10 || abs(dy) > 10) {
                            isDragging = true
                            params?.x = initialX + dx
                            params?.y = initialY + dy
                            try {
                                windowManager?.updateViewLayout(floatingView, params)
                            } catch (_: Exception) {}
                        }
                        return isDragging
                    }
                    MotionEvent.ACTION_UP -> {
                        if (isDragging) {
                            // Snap to edge
                            snapToNearestEdge()
                            return true
                        }
                        return false
                    }
                }
                return false
            }
        })
    }

    private fun snapToNearestEdge() {
        val metrics = resources.displayMetrics
        val screenWidth = metrics.widthPixels
        val currentX = params?.x ?: 0

        val targetX = if (currentX + 50 > screenWidth / 2) {
            screenWidth - (floatingView?.width ?: 120) - 20
        } else {
            20
        }

        params?.x = targetX
        try {
            windowManager?.updateViewLayout(floatingView, params)
        } catch (_: Exception) {}
    }

    private fun toggleLanguage() {
        if (currentLangCode == "bn-BD") {
            currentLangCode = "en-US"
            currentLangShort = "EN"
        } else {
            currentLangCode = "bn-BD"
            currentLangShort = "বা"
        }
        tvBubbleLangBadge?.text = currentLangShort
        vibrateDevice()
        Toast.makeText(this, "ভাষা পরিবর্তন: ${if (currentLangCode == "bn-BD") "বাংলা" else "English"}", Toast.LENGTH_SHORT).show()
    }

    private fun startListening() {
        if (isRecording) return

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Toast.makeText(this, "স্পিচ সার্ভিস উপলব্ধ নেই", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            speechRecognizer?.destroy()
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, currentLangCode)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, currentLangCode)
                putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, currentLangCode)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }

            speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    isRecording = true
                    mainHandler.post {
                        bubbleIdleView?.visibility = View.GONE
                        bubblePillView?.visibility = View.VISIBLE
                        tvPillText?.text = "শুনছি... কথা বলুন..."
                    }
                }

                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}

                override fun onEndOfSpeech() {
                    mainHandler.post {
                        tvPillText?.text = "প্রসেসিং হচ্ছে..."
                        try {
                            speechRecognizer?.stopListening()
                        } catch (_: Exception) {}
                    }
                }

                override fun onError(error: Int) {
                    mainHandler.post {
                        cancelListening()
                        Toast.makeText(this@FloatingBubbleService, "শব্দ শোনা যায়নি, আবার চেষ্টা করুন", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onResults(results: Bundle?) {
                    mainHandler.post {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            recordedText = matches[0]
                        }
                        commitSpokenText()
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        recordedText = matches[0]
                        mainHandler.post {
                            tvPillText?.text = recordedText
                        }
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            speechRecognizer?.startListening(intent)
        } catch (e: Exception) {
            cancelListening()
            Toast.makeText(this, "মাইক চালু করা সম্ভব হয়নি", Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopListeningAndCommit() {
        try {
            speechRecognizer?.stopListening()
        } catch (_: Exception) {}
        commitSpokenText()
    }

    private fun cancelListening() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Exception) {}
        speechRecognizer = null
        isRecording = false
        recordedText = ""

        mainHandler.post {
            bubblePillView?.visibility = View.GONE
            bubbleIdleView?.visibility = View.VISIBLE
        }
    }

    private fun commitSpokenText() {
        val text = cleanSpokenText(recordedText)
        if (text.isNotEmpty()) {
            vibrateDevice()

            val accessibilityService = KothaFlowAccessibilityService.instance
            var directlyTyped = false
            if (accessibilityService != null) {
                directlyTyped = accessibilityService.insertTextIntoFocusedInput(text)
            }

            if (directlyTyped) {
                Toast.makeText(this, "✓ সরাসরি টাইপ সম্পন্ন হয়েছে", Toast.LENGTH_SHORT).show()
            } else {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                val clip = android.content.ClipData.newPlainText("KothaFlow Text", text)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "✓ টেক্সট প্রস্তুত (ক্লিপবোর্ডে কপি করা হয়েছে)", Toast.LENGTH_SHORT).show()
            }
        }

        cancelListening()
    }

    private fun cleanSpokenText(raw: String): String {
        var clean = raw
        val fillers = listOf(" um ", " uh ", " ah ", " আর কি ", " এই যে ", " আআ ")
        for (filler in fillers) {
            clean = clean.replace(Regex("(?i)$filler"), " ")
        }
        return clean.trim().replace(Regex("\\s+"), " ")
    }

    private fun vibrateDevice() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
            } else {
                @Suppress("DEPRECATION")
                val v = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    v.vibrate(40)
                }
            }
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        try {
            speechRecognizer?.destroy()
        } catch (_: Exception) {}

        if (floatingView != null && windowManager != null) {
            try {
                windowManager?.removeView(floatingView)
            } catch (_: Exception) {}
        }
    }
}
