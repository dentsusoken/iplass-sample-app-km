/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.util;

import org.iplass.mtp.command.RequestContext;

/**
 * Command がリクエストパラメータをデフォルト値付きで取得するためのユーティリティ。
 */
public final class CommandRequestUtil {

	private CommandRequestUtil() {}

	/**
	 * デフォルト値付きで文字列パラメータを取得する。
	 */
	public static String getParam(RequestContext request, String name, String defaultValue) {
		String value = request.getParam(name);
		if (value == null || value.isEmpty()) {
			return defaultValue;
		}
		return value;
	}

	/**
	 * デフォルト値付きで整数パラメータを取得する。
	 */
	public static int getIntParam(RequestContext request, String name, int defaultValue) {
		String value = request.getParam(name);
		if (value == null || value.isEmpty()) {
			return defaultValue;
		}
		try {
			return Integer.parseInt(value);
		} catch (NumberFormatException e) {
			return defaultValue;
		}
	}
}
