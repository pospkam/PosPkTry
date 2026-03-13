-- Migration: Triggers for booking notifications
-- Date: 2025-11-10
-- Purpose: Auto-create notifications for booking events

-- Function to notify operator about new booking
CREATE OR REPLACE FUNCTION notify_operator_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  operator_user_id UUID;
  tour_name TEXT;
  customer_name TEXT;
BEGIN
  -- Get operator user_id and tour name
  SELECT p.user_id, t.name INTO operator_user_id, tour_name
  FROM tours t
  JOIN partners p ON t.operator_id = p.id
  WHERE t.id = NEW.tour_id;

  -- Get customer name
  SELECT name INTO customer_name FROM users WHERE id = NEW.user_id;

  -- Create notification for operator
  IF operator_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      priority,
      action_url
    ) VALUES (
      operator_user_id,
      'new_booking',
      'Новое бронирование',
      format('Получено новое бронирование на тур "%s" от %s', tour_name, customer_name),
      jsonb_build_object(
        'booking_id', NEW.id,
        'tour_id', NEW.tour_id,
        'tour_name', tour_name,
        'customer_name', customer_name,
        'total_price', NEW.total_price,
        'start_date', NEW.start_date,
        'guests_count', COALESCE(NEW.guests_count, NEW.participants)
      ),
      'high',
      format('/hub/operator/bookings/%s', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new bookings
DROP TRIGGER IF EXISTS trigger_notify_operator_new_booking ON bookings;
CREATE TRIGGER trigger_notify_operator_new_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_operator_new_booking();

-- Function to notify customer about booking status change
CREATE OR REPLACE FUNCTION notify_customer_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  tour_name TEXT;
  status_message TEXT;
  notification_priority TEXT;
BEGIN
  -- Only notify if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get tour name
  SELECT name INTO tour_name FROM tours WHERE id = NEW.tour_id;

  -- Determine message based on status
  CASE NEW.status
    WHEN 'confirmed' THEN
      status_message := format('Ваше бронирование на тур "%s" подтверждено', tour_name);
      notification_priority := 'high';
    WHEN 'cancelled' THEN
      status_message := format('Ваше бронирование на тур "%s" отменено', tour_name);
      notification_priority := 'high';
    WHEN 'completed' THEN
      status_message := format('Тур "%s" завершён. Оставьте отзыв!', tour_name);
      notification_priority := 'normal';
    ELSE
      status_message := format('Статус бронирования на тур "%s" изменён на: %s', tour_name, NEW.status);
      notification_priority := 'normal';
  END CASE;

  -- Create notification for customer
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    priority,
    action_url
  ) VALUES (
    NEW.user_id,
    'booking_status_changed',
    'Изменение статуса бронирования',
    status_message,
    jsonb_build_object(
      'booking_id', NEW.id,
      'tour_id', NEW.tour_id,
      'tour_name', tour_name,
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    notification_priority,
    format('/hub/tourist/bookings/%s', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking status changes
DROP TRIGGER IF EXISTS trigger_notify_customer_booking_status_change ON bookings;
CREATE TRIGGER trigger_notify_customer_booking_status_change
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_booking_status_change();

-- Function to notify customer about payment status change
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  tour_name TEXT;
  status_message TEXT;
BEGIN
  -- Only notify if payment status changed
  IF OLD.payment_status = NEW.payment_status THEN
    RETURN NEW;
  END IF;

  -- Get tour name
  SELECT name INTO tour_name FROM tours WHERE id = NEW.tour_id;

  -- Determine message based on payment status
  CASE NEW.payment_status
    WHEN 'paid' THEN
      status_message := format('Оплата за тур "%s" получена', tour_name);
    WHEN 'refunded' THEN
      status_message := format('Возврат средств за тур "%s" выполнен', tour_name);
    ELSE
      status_message := format('Статус оплаты за тур "%s" изменён на: %s', tour_name, NEW.payment_status);
  END CASE;

  -- Create notification for customer
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    priority,
    action_url
  ) VALUES (
    NEW.user_id,
    'payment_status_changed',
    'Изменение статуса оплаты',
    status_message,
    jsonb_build_object(
      'booking_id', NEW.id,
      'tour_id', NEW.tour_id,
      'tour_name', tour_name,
      'old_payment_status', OLD.payment_status,
      'new_payment_status', NEW.payment_status,
      'total_price', NEW.total_price
    ),
    'high',
    format('/hub/tourist/bookings/%s', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment status changes
DROP TRIGGER IF EXISTS trigger_notify_payment_status_change ON bookings;
CREATE TRIGGER trigger_notify_payment_status_change
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_status_change();

-- Function to notify operator about new review
CREATE OR REPLACE FUNCTION notify_operator_new_review()
RETURNS TRIGGER AS $$
DECLARE
  operator_user_id UUID;
  tour_name TEXT;
  customer_name TEXT;
BEGIN
  -- Get operator user_id and tour name
  SELECT p.user_id, t.name INTO operator_user_id, tour_name
  FROM tours t
  JOIN partners p ON t.operator_id = p.id
  WHERE t.id = NEW.tour_id;

  -- Get customer name
  SELECT name INTO customer_name FROM users WHERE id = NEW.user_id;

  -- Create notification for operator
  IF operator_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      priority,
      action_url
    ) VALUES (
      operator_user_id,
      'new_review',
      'Новый отзыв',
      format('Получен новый отзыв (★%s) на тур "%s" от %s', NEW.rating, tour_name, customer_name),
      jsonb_build_object(
        'review_id', NEW.id,
        'tour_id', NEW.tour_id,
        'tour_name', tour_name,
        'customer_name', customer_name,
        'rating', NEW.rating,
        'comment_preview', LEFT(NEW.comment, 100)
      ),
      CASE 
        WHEN NEW.rating <= 2 THEN 'high'
        ELSE 'normal'
      END,
      format('/hub/operator/reviews?reviewId=%s', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new reviews
DROP TRIGGER IF EXISTS trigger_notify_operator_new_review ON reviews;
CREATE TRIGGER trigger_notify_operator_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_operator_new_review();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_type_priority ON notifications(type, priority);

COMMENT ON FUNCTION notify_operator_new_booking IS 'Auto-notify operator about new bookings';
COMMENT ON FUNCTION notify_customer_booking_status_change IS 'Auto-notify customer about booking status changes';
COMMENT ON FUNCTION notify_payment_status_change IS 'Auto-notify customer about payment status changes';
COMMENT ON FUNCTION notify_operator_new_review IS 'Auto-notify operator about new reviews';
