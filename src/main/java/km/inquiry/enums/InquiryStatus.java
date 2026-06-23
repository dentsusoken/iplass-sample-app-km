/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.enums;

/**
 * 問合せのステータス値。
 */
public enum InquiryStatus {
	Open,
	Answered,
	Resolved,
	Canceled;

	/**
	 * このステータスがクローズ状態を表すかどうかを返す。
	 */
	public boolean isClosed() {
		return this == Resolved || this == Canceled;
	}
}
