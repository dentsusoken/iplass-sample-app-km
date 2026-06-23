/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.util;

import java.util.HashMap;
import java.util.Map;
import org.iplass.mtp.command.RequestContext;

/**
 * Command のレスポンス生成ユーティリティ。
 */
public class CommandResponseUtil {

	private CommandResponseUtil() {}

	// ── レスポンス生成 ──

	/**
	 * 成功レスポンスのマップを生成する。
	 */
	public static Map<String, Object> successResponse(Object data) {
		Map<String, Object> result = new HashMap<>();
		result.put("status", "SUCCESS");
		result.put("data", data);
		return result;
	}

	/**
	 * ページング付きリスト取得用の成功レスポンスマップを生成する。
	 */
	public static Map<String, Object> successListResponse(Object data, int totalCount, int offset, int limit) {
		Map<String, Object> result = new HashMap<>();
		result.put("status", "SUCCESS");
		result.put("data", data);
		result.put("totalCount", totalCount);
		result.put("offset", offset);
		result.put("limit", limit);
		return result;
	}

	/**
	 * エラーレスポンスのマップを生成する。
	 */
	public static Map<String, Object> errorResponse(String errorCode, String message) {
		Map<String, Object> result = new HashMap<>();
		result.put("status", "ERROR");
		result.put("errorCode", errorCode);
		result.put("message", message);
		return result;
	}

	/**
	 * レスポンス結果を RequestContext に設定する。
	 */
	public static void setResult(RequestContext request, Map<String, Object> result) {
		request.setAttribute("result", result);
	}
}
